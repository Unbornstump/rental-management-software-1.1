from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QListWidget


class TenantsPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()
        self.refresh()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Tenants')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        self.list_widget = QListWidget()
        layout.addWidget(title)
        layout.addWidget(self.list_widget)
        self.setLayout(layout)

    def refresh(self):
        self.list_widget.clear()
        try:
            tenants = self.client.get_tenants()
            if not tenants:
                self.list_widget.addItem('No tenants found.')
                return
            for tenant in tenants:
                self.list_widget.addItem(f"{tenant.get('full_name')} — {tenant.get('status')} — {tenant.get('phone')}")
        except Exception as error:
            self.list_widget.addItem(f'Error loading tenants: {error}')
