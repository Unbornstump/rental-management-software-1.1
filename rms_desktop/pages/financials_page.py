from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel


class FinancialsPage(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(10)

        title = QLabel('Financials')
        title.setStyleSheet('font-size: 16px; font-weight: 600;')

        subtitle = QLabel('Financial module coming soon. Use the backend API to power reports, invoices, payments, and expense views.')
        subtitle.setWordWrap(True)
        subtitle.setStyleSheet('color: #555;')

        layout.addWidget(title)
        layout.addWidget(subtitle)
        self.setLayout(layout)
