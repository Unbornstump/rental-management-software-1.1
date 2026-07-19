from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
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


class StaffManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = User.objects.create_user(
            username='manager_user',
            password='securepass123',
            role=User.MANAGER,
            must_change_password=False,
        )
        self.client.force_authenticate(user=self.manager)

    def test_create_staff_returns_temporary_password_in_response(self):
        response = self.client.post('/api/admin/staff/', {
            'username': 'staff1',
            'first_name': 'Jose',
            'last_name': 'Martinez',
            'role': User.CARETAKER,
        })

        self.assertEqual(response.status_code, 201)
        self.assertIn('temporary_password', response.data)
        self.assertEqual(response.data['username'], 'staff1')
        created_user = User.objects.get(username='staff1')
        self.assertTrue(created_user.check_password(response.data['temporary_password']))

    def test_delete_staff_removes_user_and_related_audit_logs(self):
        staff_user = User.objects.create_user(
            username='staff_to_delete',
            password='securepass123',
            role=User.CARETAKER,
        )
        AuditLog.objects.create(
            user=self.manager,
            action='Created staff account',
            target_model='CustomUser',
            target_id=staff_user.id,
            details={'username': staff_user.username},
        )

        response = self.client.delete(f'/api/admin/staff/{staff_user.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(id=staff_user.id).exists())
        self.assertFalse(AuditLog.objects.filter(target_id=staff_user.id).exists())


class PasswordRecoveryFlowTests(TestCase):
    def test_recovery_code_verification_marks_code_used_and_returns_token(self):
        user = User.objects.create_user(
            username='recoveryuser',
            password='securepass123',
            role=User.MANAGER,
        )
        user.recovery_code_hash = make_password('RMS-TEST-1234-5678')
        user.recovery_code_used = False
        user.save(update_fields=['recovery_code_hash', 'recovery_code_used'])

        response = self.client.post('/api/auth/recover/verify-code/', {
            'username': 'recoveryuser',
            'recovery_code': 'RMS-TEST-1234-5678',
        })

        self.assertEqual(response.status_code, 200)
        self.assertIn('verification_token', response.data)
        user.refresh_from_db()
        self.assertTrue(user.recovery_code_used)

    def test_old_recovery_code_is_invalid_after_password_reset(self):
        user = User.objects.create_user(
            username='rotationuser',
            password='securepass123',
            role=User.MANAGER,
        )
        old_code = 'RMS-OLD-0000-0000'
        user.recovery_code_hash = make_password(old_code)
        user.recovery_code_used = False
        user.save(update_fields=['recovery_code_hash', 'recovery_code_used'])

        SecurityQuestion.objects.create(
            user=user,
            question_1='What was the name of your first pet?',
            answer_1_hash=make_password('fluffy'.lower()),
            question_2='What city were you born in?',
            answer_2_hash=make_password('nairobi'.lower()),
        )

        verify_response = self.client.post('/api/auth/recover/verify-question/', {
            'username': 'rotationuser',
            'question': 'What was the name of your first pet?',
            'answer': 'fluffy',
        })
        self.assertEqual(verify_response.status_code, 200)
        token = verify_response.data['verification_token']

        reset_response = self.client.post('/api/auth/recover/set-password/', {
            'username': 'rotationuser',
            'new_password': 'Newstrong123',
            'method': 'question',
            'verification_token': token,
        })
        self.assertEqual(reset_response.status_code, 200)

        old_code_response = self.client.post('/api/auth/recover/verify-code/', {
            'username': 'rotationuser',
            'recovery_code': old_code,
        })
        self.assertEqual(old_code_response.status_code, 400)
        self.assertIn('error', old_code_response.data)
        self.assertIn('invalid', old_code_response.data['error'].lower())

    def test_email_reset_returns_specific_error_when_no_recovery_email_is_set(self):
        User.objects.create_user(
            username='emaillessuser',
            password='securepass123',
            role=User.MANAGER,
        )

        response = self.client.post('/api/auth/recover/send-email/', {
            'username': 'emaillessuser',
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'No recovery email is set for this account. Please use another method.')

    def test_security_question_endpoint_returns_question_options_and_accepts_selected_answer(self):
        user = User.objects.create_user(
            username='questionuser',
            password='securepass123',
            role=User.MANAGER,
        )
        SecurityQuestion.objects.create(
            user=user,
            question_1='What was the name of your first pet?',
            answer_1_hash=make_password('fluffy'.lower()),
            question_2='What city were you born in?',
            answer_2_hash=make_password('nairobi'.lower()),
        )

        question_response = self.client.get('/api/auth/recover/question-text/?username=questionuser')
        self.assertEqual(question_response.status_code, 200)
        self.assertIn('questions', question_response.data)
        self.assertIn('What was the name of your first pet?', question_response.data['questions'])

        verify_response = self.client.post('/api/auth/recover/verify-question/', {
            'username': 'questionuser',
            'question': 'What was the name of your first pet?',
            'answer': 'FLUFFY',
        })

        self.assertEqual(verify_response.status_code, 200)
        self.assertIn('verification_token', verify_response.data)


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
