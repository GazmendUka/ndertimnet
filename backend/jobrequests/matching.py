from django.db.models import Q


def company_category_query(company):
    professions = company.professions.all()
    industries = professions.exclude(industry_id=None).values_list("industry_id", flat=True)
    return (Q(profession__in=professions)
            | Q(profession__isnull=True, industry_id__in=industries)
            | Q(profession__isnull=True, industry__isnull=True, category_mode__in=["mixed", "unsure"]))


def profession_category_query(profession_id):
    from taxonomy.models import Profession
    industry_id = Profession.objects.filter(pk=profession_id, is_active=True).values_list("industry_id", flat=True).first()
    query = Q(profession_id=profession_id)
    if industry_id:
        query |= Q(profession__isnull=True, industry_id=industry_id)
    return query | Q(profession__isnull=True, industry__isnull=True, category_mode__in=["mixed", "unsure"])
