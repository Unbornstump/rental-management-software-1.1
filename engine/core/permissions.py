from rest_framework import permissions, exceptions


def RolePermission(allowed_roles):
    """Return a DRF permission class allowing only the listed roles."""
    class _RolePermission(permissions.BasePermission):
        message = 'You do not have permission to perform this action.'

        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                raise exceptions.PermissionDenied({'error': self.message})

            if request.user.role not in allowed_roles:
                raise exceptions.PermissionDenied({'error': self.message})

            return True

    _RolePermission.__name__ = f"RolePermission_{'_'.join(allowed_roles)}"
    return _RolePermission
