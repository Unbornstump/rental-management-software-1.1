from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QListWidget


class LandlordsPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()
        self.refresh()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Landlords')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        self.list_widget = QListWidget()
        layout.addWidget(title)
        layout.addWidget(self.list_widget)
        self.setLayout(layout)

    def refresh(self):
        self.list_widget.clear()
        try:
            landlords = self.client.get_landlords()
            if not landlords:
                self.list_widget.addItem('No landlords found.')
                return
            for landlord in landlords:
                self.list_widget.addItem(f"{landlord.get('full_name')} — {landlord.get('phone')} — {landlord.get('email')}")
        except Exception as error:
            self.list_widget.addItem(f'Error loading landlords: {error}')
