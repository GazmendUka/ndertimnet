# backend/accounts/serializers.py

from rest_framework import serializers
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


# 👤 CustomerSerializer
class CustomerSerializer(serializers.ModelSerializer):
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
    profile_step = serializers.SerializerMethodField()
    profile_completion = serializers.SerializerMethodField()
    logo = serializers.ImageField(required=False, allow_null=True)

    # 🔹 WRITE: tar emot lista av ID
    professions = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.filter(is_active=True),
        many=True,
        required=False,
        write_only=True,
    )

    # 🔹 WRITE: tar emot lista av city-ID
    cities = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )

    # 🔹 READ: returnerar fulla objekt
    professions_detail = ProfessionSerializer(
        source="professions",
        many=True,
        read_only=True
    )

    # 🔹 READ: returnerar fulla city-objekt (serviceområde)
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
            "city",
            "cities",           # 🔹 NY
            "cities_detail",    # 🔹 NY
            "professions",          # WRITE
            "professions_detail",   # READ
            "profile_step",
            "profile_completion",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_profile_step(self, obj):
        return get_company_profile_step(obj)
    
    def get_profile_completion(self, obj):
        return get_company_profile_completion(obj)
    
    def update(self, instance, validated_data):
        professions = validated_data.pop("professions", None)
        cities = validated_data.pop("cities", None)

        # uppdatera vanliga fält
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # uppdatera M2M
        if professions is not None:
            instance.professions.set(professions)

        if cities is not None:
            instance.cities.set(cities)

        # 🔥 RE-CALC EFTER M2M
        instance.profile_step = instance.calculate_profile_step()
        instance.save(update_fields=["profile_step"])

        return instance


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
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "phone", "address"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ky email është tashmë i regjistruar.")
        return value

    def create(self, validated_data):
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        phone = validated_data.pop("phone", "")
        address = validated_data.pop("address", "")
        password = validated_data.pop("password")
        email = validated_data.pop("email")

        user = User.objects.create_user(
            email=email,
            password=password,
            role="customer",
            first_name=first_name,
            last_name=last_name,
        )

        Customer.objects.create(
            user=user,
            phone=phone,
            address=address,
        )

        return user


class CustomerProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email", read_only=True)
    email_verified = serializers.BooleanField(source="user.email_verified", read_only=True)

    class Meta:
        model = Customer
        fields = [
            "first_name",
            "last_name",
            "phone",
            "address",
            "email",
            "email_verified",
        ]

    def update(self, instance, validated_data):
        # Uppdatera User-fält
        user_data = validated_data.pop("user", {})
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()

        # Uppdatera Customer-fält
        return super().update(instance, validated_data)

class CustomerConsentSerializer(serializers.ModelSerializer):
    consent = serializers.BooleanField(write_only=True)
    personal_number = serializers.CharField(write_only=True)

    class Meta:
        model = Customer
        fields = [
            "personal_number",
            "consent",
        ]

    def validate_personal_number(self, value):
        # Ta bort allt som inte är siffror (bindestreck, mellanslag etc.)
        cleaned = re.sub(r"\D", "", value)

        # Svenskt personnummer = 12 siffror (YYYYMMDDXXXX)
        if len(cleaned) != 12:
            raise serializers.ValidationError("Ogiltigt personnummer")

        return cleaned

    def validate_consent(self, value):
        if value is not True:
            raise serializers.ValidationError("Samtycke krävs")
        return value

    def update(self, instance, validated_data):
        request = self.context["request"]

        instance.personal_number = validated_data["personal_number"]
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
            return CustomerSerializer(customer, context=self.context).data
        except Customer.DoesNotExist:
            return None
