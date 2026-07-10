from rest_framework import serializers
from .models import Industry, Profession


class ProfessionSerializer(serializers.ModelSerializer):
    industry_detail = serializers.SerializerMethodField()

    class Meta:
        model = Profession
        fields = ["id", "name", "slug", "industry", "industry_detail"]

    def get_industry_detail(self, obj):
        if not obj.industry_id:
            return None
        return {
            "id": obj.industry_id,
            "name": obj.industry.name,
            "slug": obj.industry.slug,
        }


class IndustrySerializer(serializers.ModelSerializer):
    professions = ProfessionSerializer(many=True, read_only=True)

    class Meta:
        model = Industry
        fields = ["id", "name", "slug", "description", "professions"]
