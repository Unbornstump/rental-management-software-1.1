import os
from PyQt6.QtWidgets import QWidget, QLabel, QLineEdit, QPushButton, QVBoxLayout, QMessageBox
from PyQt6.QtCore import Qt
from windows.main_window import MainWindow


class LoginWindow(QWidget):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setWindowTitle('RMS Login')
        self.setMinimumSize(380, 220)
        self.setup_ui()
        self.load_style()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setSpacing(12)

        title = QLabel('Rental Management System')
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet('font-size: 18px; font-weight: 600; margin-bottom: 10px;')

        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText('Username')

        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText('Password')
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)

        self.login_button = QPushButton('Login')
        self.login_button.clicked.connect(self.handle_login)

        layout.addWidget(title)
        layout.addWidget(self.username_input)
        layout.addWidget(self.password_input)
        layout.addWidget(self.login_button)

        self.setLayout(layout)

    def load_style(self):
        style_path = os.path.join(os.path.dirname(__file__), '..', 'styles.qss')
        style_path = os.path.normpath(style_path)
        if os.path.exists(style_path):
            with open(style_path, 'r', encoding='utf-8') as style_file:
                self.setStyleSheet(style_file.read())

    def handle_login(self):
        username = self.username_input.text().strip()
        password = self.password_input.text()

        if not username or not password:
            QMessageBox.warning(self, 'Validation', 'Please enter both username and password.')
            return

        try:
            self.client.login(username, password)
            self.open_main_window()
        except Exception as error:
            QMessageBox.critical(self, 'Login Failed', str(error))

    def open_main_window(self):
        self.main_window = MainWindow(self.client)
        self.main_window.show()
        self.close()
