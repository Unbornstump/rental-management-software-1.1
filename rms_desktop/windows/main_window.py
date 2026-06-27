import os
from PyQt6.QtWidgets import QMainWindow, QWidget, QHBoxLayout, QFrame, QVBoxLayout, QLabel
from PyQt6.QtCore import Qt
from widgets.sidebar import Sidebar
from pages.dashboard_page import DashboardPage
from pages.properties_page import PropertiesPage
from pages.units_page import UnitsPage
from pages.landlords_page import LandlordsPage
from pages.tenants_page import TenantsPage
from pages.leases_page import LeasesPage
from pages.financials_page import FinancialsPage
from pages.maintenance_page import MaintenancePage
from pages.reports_page import ReportsPage


class MainWindow(QMainWindow):
    def __init__(self, client):
        super().__init__()
        self.client = client
        self.setWindowTitle('RMS Dashboard')
        self.resize(980, 660)
        self.setup_ui()
        self.load_section('Dashboard')

    def setup_ui(self):
        container = QWidget()
        outer_layout = QHBoxLayout()
        outer_layout.setContentsMargins(10, 10, 10, 10)
        outer_layout.setSpacing(12)

        nav_items = ['Dashboard', 'Properties', 'Units', 'Landlords', 'Tenants', 'Leases', 'Financials', 'Maintenance', 'Reports']
        self.sidebar = QFrame()
        self.sidebar.setFixedWidth(220)
        self.sidebar.setStyleSheet('background: white; border: 1px solid #d7dbe7; border-radius: 8px;')
        sidebar_layout = QVBoxLayout()
        sidebar_layout.setContentsMargins(16, 16, 16, 16)
        sidebar_layout.setSpacing(10)

        self.nav_widget = Sidebar(nav_items)
        self.nav_widget.navigation_requested.connect(self.load_section)
        sidebar_layout.addWidget(self.nav_widget)
        self.sidebar.setLayout(sidebar_layout)

        self.content_frame = QFrame()
        self.content_frame.setStyleSheet('background: white; border: 1px solid #d7dbe7; border-radius: 8px;')
        self.content_layout = QVBoxLayout()
        self.content_layout.setContentsMargins(16, 16, 16, 16)
        self.content_layout.setSpacing(12)
        self.content_frame.setLayout(self.content_layout)

        outer_layout.addWidget(self.sidebar)
        outer_layout.addWidget(self.content_frame, 1)
        container.setLayout(outer_layout)
        self.setCentralWidget(container)

    def set_content(self, widget):
        while self.content_layout.count():
            item = self.content_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        self.content_layout.addWidget(widget)

    def load_section(self, section: str):
        section_map = {
            'Dashboard': DashboardPage,
            'Properties': PropertiesPage,
            'Units': UnitsPage,
            'Landlords': LandlordsPage,
            'Tenants': TenantsPage,
            'Leases': LeasesPage,
            'Financials': FinancialsPage,
            'Maintenance': MaintenancePage,
            'Reports': ReportsPage,
        }
        page_class = section_map.get(section, DashboardPage)
        page = page_class(self.client)
        self.set_content(page)
