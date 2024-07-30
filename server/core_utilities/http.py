from __future__ import annotations

import abc
from enum import IntEnum
from typing import TYPE_CHECKING

from aiohttp import web_request, hdrs
from multidict import MutableMultiMapping

from .functions import local_now

if TYPE_CHECKING:
    from .classes import SiteHost
    from web_server import WebApplication

__all__ = ("CustomRequest", "HTTPStatus", "CustomHTTPException")


class _CopyMultiMapping(MutableMultiMapping):
    @abc.abstractmethod
    def copy(self) -> _CopyMultiMapping: ...


class CustomRequest(web_request.Request):
    site_host: SiteHost
    headers: _CopyMultiMapping

    def __init__(self, app: WebApplication, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.aventuros_app = app
        method_override = self.headers.get("X-HTTP-Method-Override")
        if method_override is not None:
            self._method = method_override
        self.host_without_port: str | None = None if self.host is None else self.host.split(":", 1)[0]
        self.user_agent: str = self.headers.get(hdrs.USER_AGENT, "")
        self.log_request = True
        self.received_at = local_now()


class HTTPStatus(IntEnum):
    def __new__(cls, value, phrase, description=''):
        obj = int.__new__(cls, value)
        obj._value_ = value

        obj.phrase = phrase
        obj.description = description
        return obj

    # informational
    CONTINUE = 100, 'Continue', 'Attente de la suite de la requête.'
    SWITCHING_PROTOCOLS = (101, 'Switching Protocols', "Acceptation du changement de protocole.")
    PROCESSING = 102, 'Processing...'

    # success
    OK = 200, 'OK', 'Requête traitée avec succès'
    CREATED = 201, 'Created', 'Requête traitée avec succès et création d’un document.'
    ACCEPTED = (202, 'Accepted', 'Requête traitée, mais sans garantie de résultat.')
    NON_AUTHORITATIVE_INFORMATION = (203, 'Non-Authoritative Information', 'Information retournée, mais générée par une source non certifiée.')
    NO_CONTENT = 204, 'No Content', 'Requête traitée avec succès mais pas d’information à renvoyer.'
    RESET_CONTENT = 205, 'Reset Content', 'Requête traitée avec succès, la page courante peut être effacée.'
    PARTIAL_CONTENT = 206, 'Partial Content', 'Une partie seulement de la ressource a été transmise.'
    MULTI_STATUS = 207, 'Multi-Status'
    ALREADY_REPORTED = 208, 'Already Reported'
    IM_USED = 226, 'IM Used'

    # redirection
    MULTIPLE_CHOICES = (300, 'Multiple Choices', 'L’URI demandée se rapporte à plusieurs ressources')
    MOVED_PERMANENTLY = (301, 'Moved Permanently', 'Document déplacé de façon permanente.')
    FOUND = 302, 'Found', 'Document déplacé de façon temporaire'
    SEE_OTHER = 303, 'See Other', 'La réponse à cette requête est ailleurs'
    NOT_MODIFIED = (304, 'Not Modified', 'Document non modifié depuis la dernière requête')
    USE_PROXY = (305, 'Use Proxy', 'La requête doit être ré-adressée au proxy')
    TEMPORARY_REDIRECT = (307, 'Temporary Redirect', 'La requête doit être redirigée temporairement vers l’URI spécifiée')
    PERMANENT_REDIRECT = (308, 'Permanent Redirect', 'La requête doit être redirigée définitivement vers l’URI spécifiée')
    TOO_MANY_REDIRECTS = (310, 'Too many Redirects', 'La requête doit être redirigée de trop nombreuses fois, ou est victime d’une boucle de redirection.')

    # client error
    BAD_REQUEST = (400, 'Bad Request', 'La syntaxe de la requête est erronée')
    UNAUTHORIZED = (401, 'Unauthorized', 'Une authentification est nécessaire pour accéder à la ressource')
    PAYMENT_REQUIRED = (402, 'Payment Required', 'Paiement requis pour accéder à la ressource')
    FORBIDDEN = (403, 'Forbidden', "Accès refusé -- l'autorisation ne va pas aider")
    NOT_FOUND = (404, 'Not Found', 'Ressource non trouvée')
    METHOD_NOT_ALLOWED = (405, 'Method Not Allowed', 'Méthode de requête non autorisée')
    NOT_ACCEPTABLE = (406, 'Not Acceptable', '''La ressource demandée n'est pas disponible dans un format qui respecterait l'en-tête "Accept" de la requête''')
    PROXY_AUTHENTICATION_REQUIRED = (407, 'Proxy Authentication Required', 'Accès à la ressource autorisé par identification avec le proxy')
    REQUEST_TIMEOUT = (408, 'Request Timeout', 'Temps d’attente d’une requête du client, écoulé côté serveur')
    CONFLICT = 409, 'Conflict', 'La requête ne peut être traitée en l’état actuel'
    GONE = (410, 'Gone', "La ressource n'est plus disponible et aucune adresse de redirection n’est connue")
    LENGTH_REQUIRED = (411, 'Length Required', 'La longueur de la requête n’a pas été précisée')
    PRECONDITION_FAILED = (412, 'Precondition Failed', 'Préconditions envoyées par la requête non vérifiées')
    REQUEST_ENTITY_TOO_LARGE = (413, 'Request Entity Too Large', 'Traitement abandonné dû à une requête trop importante')
    REQUEST_URI_TOO_LONG = (414, 'Request-URI Too Long', 'URI trop longue')
    UNSUPPORTED_MEDIA_TYPE = (415, 'Unsupported Media Type', 'Format de requête non supporté pour une méthode et une ressource donnée')
    REQUESTED_RANGE_NOT_SATISFIABLE = (416, 'Requested Range Not Satisfiable', 'Champs d’en-tête de requête « range » incorrect')
    EXPECTATION_FAILED = (417, 'Expectation Failed', 'Comportement attendu et défini dans l’en-tête de la requête insatisfaisante')
    IM_A_TEAPOT = (418, "I'm a teapot", "Je suis une théière")
    MISDIRECTED_REQUEST = (421, 'Misdirected Request', "La requête a été envoyée à un serveur qui n'est pas capable de produire une réponse")
    UNPROCESSABLE_ENTITY = 422, 'Unprocessable Entity'
    LOCKED = 423, 'Locked'
    FAILED_DEPENDENCY = 424, 'Failed Dependency'
    UPGRADE_REQUIRED = 426, 'Upgrade Required'
    PRECONDITION_REQUIRED = (428, 'Precondition Required', 'La requête doit être conditionnelle')
    TOO_MANY_REQUESTS = (429, 'Too Many Requests', 'Le client a émis trop de requêtes dans un délai donné')
    REQUEST_HEADER_FIELDS_TOO_LARGE = (431, 'Request Header Fields Too Large', 'Les entêtes HTTP émises dépassent la taille maximale admise par le serveur')

    # server errors
    INTERNAL_SERVER_ERROR = (500, 'Internal Server Error', 'Erreur interne du serveur')
    NOT_IMPLEMENTED = (501, 'Not Implemented', 'Fonctionnalité réclamée non supportée par le serveur')
    BAD_GATEWAY = (502, 'Bad Gateway', 'En agissant en tant que serveur proxy ou passerelle, le serveur a reçu une réponse invalide depuis le serveur distant')
    SERVICE_UNAVAILABLE = (503, 'Service Unavailable', 'Service temporairement indisponible ou en maintenance')
    GATEWAY_TIMEOUT = (504, 'Gateway Timeout', 'Temps d’attente d’une réponse d’un serveur à un serveur intermédiaire écoulé')
    HTTP_VERSION_NOT_SUPPORTED = (505, 'HTTP Version Not Supported', 'Version HTTP non gérée par le serveur')
    VARIANT_ALSO_NEGOTIATES = 506, 'Variant Also Negotiates'
    INSUFFICIENT_STORAGE = 507, 'Insufficient Storage'
    LOOP_DETECTED = 508, 'Loop Detected'
    NOT_EXTENDED = 510, 'Not Extended'
    NETWORK_AUTHENTICATION_REQUIRED = (511, 'Network Authentication Required', "Le client doit s'authentifier pour accéder au réseau")


class CustomHTTPException(Exception):
    def __init__(self, status: int | HTTPStatus, message: str = None, explain: str = None, headers=None):
        if not isinstance(status, HTTPStatus):
            status = HTTPStatus(status)
        self.status = status
        self.message = message or status.phrase
        self.explain = explain or status.description
        self.headers = headers

    @classmethod
    def only_explain(cls, status: int | HTTPStatus, explain: str, headers=None, /) -> CustomHTTPException:
        return CustomHTTPException(status, None, explain, headers)
