#backend/main/pagination.py

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class AlbanianPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_page_size(self, request):
        try:
            size = int(request.query_params.get(self.page_size_query_param, self.page_size))
            if size in [10, 25, 50]:
                return size
        except (TypeError, ValueError):
            pass
        return self.page_size

    # STANDARD DRF FORMAT:
    # {
    #   "count": ...,
    #   "next": ...,
    #   "previous": ...,
    #   "results": [...]
    # }
