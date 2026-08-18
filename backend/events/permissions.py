from rest_framework import permissions


class IsOrganizerOrReadOnly(permissions.BasePermission):
    """Anyone can read; only the event's organizer or staff can write."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or obj.organizer_id == request.user.id)
        )


class IsEventOrganizerOrStaff(permissions.BasePermission):
    """For nested writes (tickets, images) under an event: only that
    event's organizer or staff may create/modify."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        event = view.get_event()
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or event.organizer_id == request.user.id)
        )


class IsReviewAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or obj.user_id == request.user.id)
        )
