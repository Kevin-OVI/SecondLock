from aiohttp.web import StreamResponse
from aiohttp.web_exceptions import HTTPNoContent

from core_utilities import CustomHTTPException, CustomRequest, HTTPStatus
from decorators import route
from module_loader import HTTPModule, ModulesManager
from ..utils.a2f import generate_code, next_timecode_in
from ..utils.models import CreateSiteModel, UpdateSiteModel
from ...utils import make_json_response, parse_json_content


class SitesAPIModule(HTTPModule):
    __slots__ = ("core",)

    def __init__(self):
        super().__init__()
        from ..core import APICoreModule
        self.core = self.modules_manager.get_module(APICoreModule)

    @route("POST", "/api/sites")
    async def post_site(self, request: CustomRequest) -> StreamResponse:
        token = self.core.check_authorization(request)
        site_payload = await parse_json_content(request, CreateSiteModel)

        code = generate_code(site_payload.secret)
        encrypted_name = token.encrypt_string(site_payload.name)
        encrypted_secret = token.encrypt_string(site_payload.secret)
        with self.core.db:
            site_id = self.core.db.execute("INSERT INTO sites (user, name, secret) VALUES (?, ?, ?) RETURNING id",
                (token.user_id, encrypted_name, encrypted_secret)).fetchone()[0]
        return make_json_response(HTTPStatus.CREATED, {
            "id": site_id,
            "name": site_payload.name,
            "code": code,
            "next_update": next_timecode_in()
        })

    @route("GET", "/api/sites")
    async def get_sites(self, request: CustomRequest) -> StreamResponse:
        token = self.core.check_authorization(request)
        sites = []

        for site_id, encrypted_name, encrypted_secret in self.core.db.execute("SELECT id, name, secret FROM sites WHERE user=?", (token.user_id,)):
            sites.append({
                "id": site_id,
                "name": token.decrypt_string(encrypted_name),
                "code": generate_code(token.decrypt_string(encrypted_secret))
            })

        return make_json_response(HTTPStatus.OK, {
            "sites": sites,
            "next_update": next_timecode_in()
        })

    @route("PATCH", "/api/sites/{id:\\d+}")
    async def patch_site(self, request) -> StreamResponse:
        token = self.core.check_authorization(request)
        site_payload = await parse_json_content(request, UpdateSiteModel)
        site_id = int(request.match_info["id"])

        encrypted_name = token.encrypt_string(site_payload.name)
        with self.core.db:
            res = self.core.db.execute("UPDATE sites SET name=? WHERE id=? AND user=? RETURNING secret",
                (encrypted_name, site_id, token.user_id)).fetchone()
            if res is None:
                raise CustomHTTPException(HTTPStatus.NOT_FOUND)
            encrypted_secret = res[0]

        code = generate_code(token.decrypt_string(encrypted_secret))
        return make_json_response(HTTPStatus.OK, {
            "id": site_id,
            "name": site_payload.name,
            "code": code,
            "next_update": next_timecode_in()
        })

    @route("DELETE", "/api/sites/{id:\\d+}")
    async def delete_site(self, request: CustomRequest) -> StreamResponse:
        token = self.core.check_authorization(request)
        site_id = int(request.match_info["id"])

        with self.core.db:
            rowcount = self.core.db.execute("DELETE FROM sites WHERE id=? AND user=?", (site_id, token.user_id)).rowcount
        if rowcount == 0:
            raise CustomHTTPException(HTTPStatus.NOT_FOUND)
        return HTTPNoContent()


async def setup(modules_manager: ModulesManager):
    modules_manager.add_http_module(SitesAPIModule())
