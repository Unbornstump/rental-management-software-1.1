from django.apps import AppConfig


class FinancialsConfig(AppConfig):
    name = 'financials'

    def ready(self):
        import financials.signals
