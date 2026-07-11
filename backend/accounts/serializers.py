# backend/accounts/serializers.py

from rest_framework import serializers
from django.db.models import Avg, Count, Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import EmailVerificationToken
from .models import Customer, Company

import re

from taxonomy.models import Profession
from taxonomy.serializers import ProfessionSerializer
from locations.models import City
from locations.serializers import CitySerializer
from accounts.services.profile_completeness import (
    get_company_profile_step,
    get_company_profile_completion,
)

User = get_user_model()

# 🧱 Bas: UserSerializer
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["is_active", "date_joined", "created_at", "updated_at"]


# ⚠️ Basic serializer – används endast i enkla sammanhang
# Använd CustomerProfileSerializer för full profil
class BasicCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "user", "phone", "address"]
        extra_kwargs = {"user": {"write_only": True}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user"] = UserSerializer(instance.user).data
        return data


# 🏢 CompanySerializer
class CompanySerializer(serializers.ModelSerializer):
    can_access_marketplace = serializers.SerializerMethodField()
    missing_requirements = serializers.SerializerMethodField()
    recommended_improvements = serializers.SerializerMethodField()
    profile_step = serializers.SerializerMethodField()
    profile_completion = serializers.SerializerMethodField()
    logo = serializers.ImageField(required=False, allow_null=True)
    logo_url = serializers.SerializerMethodField()
    rating_summary = serializers.SerializerMethodField()

    professions = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.filter(is_active=True),
        many=True,
        required=False,
        write_only=True,
    )

    cities = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )

    professions_detail = ProfessionSerializer(
        source="professions",
        many=True,
        read_only=True
    )

    cities_detail = CitySerializer(
        source="cities",
        many=True,
        read_only=True
    )

    city = CitySerializer(read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "company_name",
            "org_number",
            "phone",
            "website",
            "address",
            "description",
            "logo",
            "logo_url",
            "city",
            "cities",
            "cities_detail",
            "professions",
            "professions_detail",
            "profile_step",
            "profile_completion",
            "is_active",
            "created_at",
            "updated_at",
            "registration_document",
            "can_access_marketplace",
            "missing_requirements",
            "recommended_improvements",
            "rating_summary",
        ]

    def to_internal_value(self, data):
        data = data.copy()

        if hasattr(data, "getlist"):
            if "professions" in data:
                data.setlist("professions", data.getlist("professions"))
            if "cities" in data:
                data.setlist("cities", data.getlist("cities"))

        return super().to_internal_value(data)

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        try:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        except (ValueError, OSError):
            return None

    def get_rating_summary(self, obj):
        from offers.models import OfferReview

        cache = self.context.setdefault("_rating_summary_cache", {})
        if obj.pk in cache:
            return cache[obj.pk]

        reviews = obj.reviews.filter(
            moderation_status=OfferReview.ModerationStatus.PUBLISHED,
        )
        summary = reviews.aggregate(
            average=Avg("rating"),
            count=Count("id"),
            recommended_count=Count("id", filter=Q(recommended=True)),
            **{
                f"star_{star}": Count("id", filter=Q(rating=star))
                for star in range(1, 6)
            },
        )
        count = summary["count"] or 0
        recommended_count = summary["recommended_count"] or 0
        result = {
            "average": round(float(summary["average"]), 1) if summary["average"] is not None else None,
            "count": count,
            "recommended_percentage": round((recommended_count / count) * 100) if count else None,
            "distribution": {str(star): summary[f"star_{star}"] or 0 for star in range(5, 0, -1)},
        }
        cache[obj.pk] = result
        return result

    def get_profile_step(self, obj):
        return get_company_profile_step(obj)

    def get_profile_completion(self, obj):
        return get_company_profile_completion(obj)
    
    def get_can_access_marketplace(self, obj):
        return obj.can_access_marketplace()


    def get_missing_requirements(self, obj):
        return obj.get_missing_requirements()


    def get_recommended_improvements(self, obj):
        return obj.get_recommended_improvements()

    def update(self, instance, validated_data):
        print("COMPANY VALIDATED DATA:", validated_data)

        professions = validated_data.pop("professions", None)
        cities = validated_data.pop("cities", None)

        if "logo" in validated_data:
            instance.logo = validated_data.pop("logo")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if professions is not None:
            instance.professions.set(professions)

        if cities is not None:
            instance.cities.set(cities)

        instance.profile_step = instance.calculate_profile_step()
        instance.save(update_fields=["profile_step"])

        return instance


class PublicCompanySerializer(serializers.ModelSerializer):
    """Public company data only; excludes contact and onboarding documents."""

    logo_url = serializers.SerializerMethodField()
    rating_summary = serializers.SerializerMethodField()
    city = CitySerializer(read_only=True)
    cities_detail = CitySerializer(source="cities", many=True, read_only=True)
    professions_detail = ProfessionSerializer(source="professions", many=True, read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "company_name",
            "description",
            "website",
            "logo_url",
            "city",
            "cities_detail",
            "professions_detail",
            "is_verified",
            "created_at",
            "rating_summary",
        ]

    def get_logo_url(self, obj):
        return CompanySerializer(context=self.context).get_logo_url(obj)

    def get_rating_summary(self, obj):
        return CompanySerializer(context=self.context).get_rating_summary(obj)


# 🏢 RegisterCompanySerializer (KONTO-REGISTRERING)
class RegisterCompanySerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "company_name",
            "phone",
        ]
        extra_kwargs = {
            "email": {"validators": []},  # 🔥 disable automatic unique validator
        }

    def validate_email(self, value):
        user = User.objects.filter(email__iexact=value).first()

        if not user:
            return value

        if user.is_active:
            raise serializers.ValidationError("Ky email është tashmë i regjistruar.")

        # User exists but inactive
        if user.role != "company":
            raise serializers.ValidationError("Ky email është përdorur me një rol tjetër.")

        return value



    def create(self, validated_data):
        company_name = validated_data.pop("company_name")
        phone = validated_data.pop("phone", "")
        password = validated_data.pop("password")
        email = validated_data.pop("email")

        existing_user = User.objects.filter(email__iexact=email, role="company").first()

        # 🔐 Soft-deleted user exists → start reactivation flow
        if existing_user and not existing_user.is_active:
            from accounts.services.reactivation import initiate_company_reactivation

            initiate_company_reactivation(email, self.context.get("request"))

            raise serializers.ValidationError({
                "email": "Ky email është i çaktivizuar. Kontrollo email-in për riaktivizim."
            })

        # 🆕 Otherwise create new
        user = User.objects.create_user(
            email=email,
            password=password,
            role="company",
        )

        Company.objects.create(
            user=user,
            company_name=company_name,
            phone=phone,
        )

        return user






# 👤 RegisterCustomerSerializer
class RegisterCustomerSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "password"]

    def validate_email(self, value):
        user = User.objects.filter(email__iexact=value).first()

        if not user:
            return value

        if user.is_active:
            raise serializers.ValidationError("Ky email është tashmë i regjistruar.")

        if user.role != "customer":
            raise serializers.ValidationError("Ky email është përdorur me një rol tjetër.")

        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data.pop("email")

        existing_user = User.objects.filter(email__iexact=email, role="customer").first()

        # 🔐 Soft-deleted user → start reactivation flow
        if existing_user and not existing_user.is_active:
            from accounts.services.reactivation import initiate_customer_reactivation

            initiate_customer_reactivation(email, self.context.get("request"))

            raise serializers.ValidationError({
                "email": "Ky email është i çaktivizuar. Kontrollo email-in për riaktivizim."
            })

        # 🆕 Create new user
        user = User.objects.create_user(
            email=email,
            password=password,
            role="customer",
        )

        # ✅ VIKTIGT – skapa profil
        customer, _ = Customer.objects.get_or_create(user=user)

        return user


class CustomerProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email", read_only=True)
    email_verified = serializers.BooleanField(source="user.email_verified", read_only=True)
    city_id = serializers.PrimaryKeyRelatedField(
        source="city",
        queryset=City.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    city_detail = CitySerializer(source="city", read_only=True)

    class Meta:
        model = Customer
        fields = [
            "first_name",
            "last_name",
            "phone",
            "address",
            "postal_code",
            "city_id",
            "city_detail",
            "email",
            "email_verified",
        ]
    


    def update(self, instance, validated_data):
        # User fields
        user_data = validated_data.pop("user", None)
        if user_data:
            for attr, value in user_data.items():
                setattr(instance.user, attr, value)
            instance.user.save()

        # City – only if provided in payload
        if "city" in validated_data:
            instance.city = validated_data.pop("city")

        # Other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

class CustomerConsentSerializer(serializers.ModelSerializer):
    consent = serializers.BooleanField(write_only=True)

    class Meta:
        model = Customer
        fields = [
            "consent",
        ]

    def validate_consent(self, value):
        if value is not True:
            raise serializers.ValidationError("Samtycke krävs")
        return value

    def update(self, instance, validated_data):
        request = self.context["request"]

        instance.consent_job_publish = True
        instance.consent_job_publish_at = timezone.now()
        instance.consent_job_publish_ip = request.META.get("REMOTE_ADDR")

        instance.save()
        return instance


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.UUIDField()

    def validate(self, attrs):
        token_value = attrs.get("token")

        try:
            token_obj = EmailVerificationToken.objects.select_related("user").get(
                token=token_value
            )
        except EmailVerificationToken.DoesNotExist:
            raise serializers.ValidationError("Ogiltig eller utgången verifieringslänk.")

        if token_obj.is_used:
            raise serializers.ValidationError("Ogiltig eller utgången verifieringslänk.")

        if token_obj.is_expired():
            raise serializers.ValidationError("Ogiltig eller utgången verifieringslänk.")

        attrs["token_obj"] = token_obj
        return attrs


class ResendVerificationSerializer(serializers.Serializer):
    # ingen input behövs – vi använder request.user
    pass


class MeSerializer(serializers.ModelSerializer):
    company = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "email_verified",
            "company",
            "customer",
        ]

    def get_company(self, user):
        if user.role != "company":
            return None

        try:
            company = Company.objects.get(user=user)
            return CompanySerializer(company, context=self.context).data
        except Company.DoesNotExist:
            return None

    def get_customer(self, user):
        if user.role != "customer":
            return None

        try:
            customer = Customer.objects.get(user=user)
            return CustomerProfileSerializer(customer, context=self.context).data
        except Customer.DoesNotExist:
            return None
