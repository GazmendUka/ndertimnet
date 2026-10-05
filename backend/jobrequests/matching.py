from django.db.models import Q


def company_category_query(company):
    professions = company.professions.all()
    industries = professions.exclude(industry_id=None).values_list("industry_id", flat=True)
    return (Q(profession__in=professions)
            | Q(profession__isnull=True, industry_id__in=industries)
            | Q(profession__isnull=True, industry__isnull=True, category_mode__in=["mixed", "unsure"]))
