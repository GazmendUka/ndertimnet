from unittest.mock import patch
from django.test import SimpleTestCase, override_settings
from payments.services import raiaccept as r


@override_settings(RAIACCEPT_MODE="sandbox", RAIACCEPT_SANDBOX_USERNAME="synthetic-user",
                   RAIACCEPT_SANDBOX_PASSWORD="synthetic-password")
class RaiAcceptAuthProtocolTests(SimpleTestCase):
    @patch.object(r, "_send_json")
    def test_auth_uses_cognito_protocol_content_type(self, send):
        send.return_value = {"AuthenticationResult": {"IdToken": "synthetic-token"}}
        self.assertEqual(r.retrieve_access_token(), "synthetic-token")
        request = send.call_args.args[0]
        self.assertEqual(request.get_header("Content-type"), "application/x-amz-json-1.1")
        self.assertEqual(request.get_header("X-amz-target"), "AWSCognitoIdentityProviderService.InitiateAuth")

    @patch.object(r, "_send_json", return_value={"Output": {"__type": "UnknownOperationException"}})
    def test_error_envelope_cannot_be_used_as_token(self, send):
        with self.assertRaises(r.RaiAcceptError):
            r.retrieve_access_token()

    @patch.object(r, "_send_json", return_value={})
    def test_normal_json_requests_keep_their_content_type(self, send):
        r._post_json("https://example.invalid/orders", {})
        self.assertEqual(send.call_args.args[0].get_header("Content-type"), "application/json")


class RaiAcceptCountryTests(SimpleTestCase):
    @override_settings(RAIACCEPT_DEFAULT_COUNTRY="XKX")
    def test_kosovo_uses_gateway_country_enum_including_legacy_default(self):
        for code in ("XK", "xk", "XKX", "XKK", "", None):
            with self.subTest(code=code):
                self.assertEqual(r.country_to_iso3(code), "XKK")
        self.assertEqual(r.country_to_iso3("AL"), "ALB")

    @override_settings(RAIACCEPT_DEFAULT_COUNTRY="ALB")
    def test_other_configured_default_is_preserved(self):
        self.assertEqual(r.country_to_iso3(None), "ALB")
