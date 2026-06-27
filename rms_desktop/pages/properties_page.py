from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QListWidget


class PropertiesPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()
        self.refresh()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Properties')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        self.list_widget = QListWidget()
        layout.addWidget(title)
        layout.addWidget(self.list_widget)
        self.setLayout(layout)

    def refresh(self):
        self.list_widget.clear()
        try:
            properties = self.client.get_properties()
            if not properties:
                self.list_widget.addItem('No properties found.')
                return
            for prop in properties:
                self.list_widget.addItem(f"{prop.get('name')} — {prop.get('property_type')} — {prop.get('location')}")
        except Exception as error:
            self.list_widget.addItem(f'Error loading properties: {error}')
