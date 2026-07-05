from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from core.models import SecurityQuestion, RecoveryCode, AuditLog, SystemSettings
from .serializers import AuditLogSerializer, SystemSettingsSerializer

User = get_user_model()


class SetupFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_setup_status_reports_setup_required_when_no_manager_exists(self):
        response = self.client.get('/api/auth/setup-status/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['setup_required'])

    def test_register_endpoint_creates_first_manager_account(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'firstmanager',
            'full_name': 'First Manager',
            'password': 'Strongpass123',
        })

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username='firstmanager')
        self.assertEqual(user.role, User.MANAGER)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertFalse(user.must_change_password)

    def test_register_endpoint_requires_authentication_once_manager_exists(self):
        User.objects.create_user(
            username='existingmanager',
            password='Securepass123',
            role=User.MANAGER,
        )

        response = self.client.post('/api/auth/register/', {
            'username': 'anothermanager',
            'full_name': 'Another Manager',
            'password': 'Strongpass123',
        })

        self.assertEqual(response.status_code, 403)


class SecurityQuestionFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            username='rms_manager',
            password='securepass123',
            role=User.MANAGER,
            must_change_password=False,
        )

    def test_manager_can_setup_security_questions_and_use_recovery_code(self):
        self.client.force_authenticate(user=self.manager)

        setup_response = self.client.post('/api/auth/security-questions/', {
            'question_1': 'What was the name of your first pet?',
            'answer_1': 'Milo',
            'question_2': 'What city were you born in?',
            'answer_2': 'Nairobi',
        })
        self.assertEqual(setup_response.status_code, 200)
        self.assertTrue(SecurityQuestion.objects.filter(user=self.manager).exists())

        verify_response = self.client.post('/api/auth/verify-security-questions/', {
            'answer_1': 'milo',
            'answer_2': 'Nairobi',
        })
        self.assertEqual(verify_response.status_code, 200)
        self.assertIn('recovery_code', verify_response.data)

        recovery_code = verify_response.data['recovery_code']
        login_response = self.client.post('/api/auth/login-with-recovery-code/', {
            'code': recovery_code,
        })
        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.data['user']['must_change_password'])
        self.assertTrue(RecoveryCode.objects.filter(user=self.manager, used=True).exists())


class AdminAuditAndSettingsTests(TestCase):
    def test_audit_log_serializer_generates_human_readable_details(self):
        manager = User.objects.create_user(
            username='rms_manager',
            password='securepass123',
            role=User.MANAGER,
        )
        audit_log = AuditLog.objects.create(
            user=manager,
            action='Login',
            target_model='CustomUser',
            target_id=manager.id,
            details={'username': manager.username, 'role': manager.role},
        )

        serializer = AuditLogSerializer(audit_log)

        self.assertEqual(serializer.data['readable_details'], 'Logged in as manager')
        self.assertEqual(serializer.data['target_display'], 'rms_manager')

    def test_system_settings_serializer_rejects_invalid_values(self):
        serializer = SystemSettingsSerializer(data={
            'company_name': '',
            'contact_phone': 'abc',
            'rent_due_day': 32,
            'grace_period_days': 0,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('company_name', serializer.errors)
        self.assertIn('contact_phone', serializer.errors)
        self.assertIn('rent_due_day', serializer.errors)
        self.assertIn('grace_period_days', serializer.errors)
