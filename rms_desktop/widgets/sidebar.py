from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QPushButton, QSizePolicy
from PyQt6.QtCore import Qt, pyqtSignal


class Sidebar(QWidget):
    navigation_requested = pyqtSignal(str)

    def __init__(self, items):
        super().__init__()
        self.items = items
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        header = QLabel('Navigation')
        header.setAlignment(Qt.AlignmentFlag.AlignLeft)
        header.setStyleSheet(
            'font-size: 14px; font-weight: 700; color: #333; padding-bottom: 6px;'
        )
        layout.addWidget(header)

        for label in self.items:
            button = QPushButton(label)
            button.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            button.setMinimumHeight(42)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.setStyleSheet(
                'background-color: #2f80ed; color: white; border: none; border-radius: 8px; padding: 10px 14px; text-align: left;'
            )
            button.clicked.connect(lambda checked, text=label: self.navigation_requested.emit(text))
            layout.addWidget(button)

        layout.addStretch()
        self.setLayout(layout)
