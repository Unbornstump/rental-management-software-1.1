from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel


class ReportsPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Reports')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        subtitle = QLabel('Reports module coming soon. This page will show occupancy, income, expense, and tenant balance analytics.')
        subtitle.setWordWrap(True)
        subtitle.setStyleSheet('color: #555;')

        layout.addWidget(title)
        layout.addWidget(subtitle)
        self.setLayout(layout)
