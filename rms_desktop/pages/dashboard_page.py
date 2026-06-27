from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QListWidget


class DashboardPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()
        self.refresh()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Dashboard')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        self.stats_list = QListWidget()
        layout.addWidget(title)
        layout.addWidget(self.stats_list)
        self.setLayout(layout)

    def refresh(self):
        self.stats_list.clear()
        try:
            properties = self.client.get_properties()
            units = self.client.get_units()
            tenants = self.client.get_tenants()
            leases = self.client.get_leases()

            self.stats_list.addItem(f'Total properties: {len(properties)}')
            self.stats_list.addItem(f'Total units: {len(units)}')
            self.stats_list.addItem(f'Total tenants: {len(tenants)}')
            self.stats_list.addItem(f'Total leases: {len(leases)}')
        except Exception as error:
            self.stats_list.addItem(f'Error loading dashboard: {error}')
