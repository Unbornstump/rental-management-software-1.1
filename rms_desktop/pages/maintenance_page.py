from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel


class MaintenancePage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Maintenance')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        subtitle = QLabel('Maintenance module coming soon. Use this space to manage repair requests, assignments, and maintenance history.')
        subtitle.setWordWrap(True)
        subtitle.setStyleSheet('color: #555;')

        layout.addWidget(title)
        layout.addWidget(subtitle)
        self.setLayout(layout)
