from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class AlbanianPagination(PageNumberPagination):
    """🇦🇱 Paginim standard në shqip për të gjitha API-t."""
    page_size = 10
    page_size_query_param = "perfaqe"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            "total": self.page.paginator.count,
            "faqe_aktuale": self.page.number,
            "faqe_totale": self.page.paginator.num_pages,
            "rezultate_per_faqe": self.page_size,
            "rezultatet": data,
        })
