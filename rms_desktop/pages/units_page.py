from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QListWidget


class UnitsPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()
        self.refresh()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Units')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        self.list_widget = QListWidget()
        layout.addWidget(title)
        layout.addWidget(self.list_widget)
        self.setLayout(layout)

    def refresh(self):
        self.list_widget.clear()
        try:
            units = self.client.get_units()
            if not units:
                self.list_widget.addItem('No units found.')
                return
            for unit in units:
                self.list_widget.addItem(f"{unit.get('unit_number')} — {unit.get('unit_type')} — {unit.get('status')} — Rent: {unit.get('rent_amount')}")
        except Exception as error:
            self.list_widget.addItem(f'Error loading units: {error}')
