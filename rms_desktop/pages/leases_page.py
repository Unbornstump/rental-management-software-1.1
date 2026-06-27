from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QListWidget


class LeasesPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()
        self.refresh()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Leases')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        self.list_widget = QListWidget()
        layout.addWidget(title)
        layout.addWidget(self.list_widget)
        self.setLayout(layout)

    def refresh(self):
        self.list_widget.clear()
        try:
            leases = self.client.get_leases()
            if not leases:
                self.list_widget.addItem('No leases found.')
                return
            for lease in leases:
                self.list_widget.addItem(f"{lease.get('tenant_name')} — {lease.get('unit_number')} — {lease.get('status')} ({lease.get('start_date')} to {lease.get('end_date')})")
        except Exception as error:
            self.list_widget.addItem(f'Error loading leases: {error}')
