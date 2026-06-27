from PyQt6.QtWidgets import QFrame, QLabel, QVBoxLayout


class PropertyCard(QFrame):
    def __init__(self, name: str, property_type: str, location: str):
        super().__init__()
        self.setFrameShape(QFrame.Shape.StyledPanel)
        self.setStyleSheet('border: 1px solid #d7dbe7; border-radius: 8px; padding: 12px;')
        self.setup_ui(name, property_type, location)

    def setup_ui(self, name: str, property_type: str, location: str):
        layout = QVBoxLayout()
        layout.setSpacing(4)

        title = QLabel(name)
        title.setStyleSheet('font-weight: 700; font-size: 14px;')

        meta = QLabel(f'{property_type.title()} • {location}')
        meta.setStyleSheet('color: #555;')

        layout.addWidget(title)
        layout.addWidget(meta)
        self.setLayout(layout)
