import os
import sys
from PyQt6.QtWidgets import QApplication
from windows.login_window import LoginWindow
from api_client import ApiClient


def main():
    app = QApplication(sys.argv)

    style_path = os.path.join(os.path.dirname(__file__), 'styles.qss')
    if os.path.exists(style_path):
        with open(style_path, 'r', encoding='utf-8') as style_file:
            app.setStyleSheet(style_file.read())

    client = ApiClient()
    login = LoginWindow(client)
    login.show()
    sys.exit(app.exec())


if __name__ == '__main__':
    main()


if __name__ == '__main__':
    main()
