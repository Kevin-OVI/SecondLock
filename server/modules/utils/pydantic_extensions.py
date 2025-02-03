from __future__ import annotations

import json
from typing import NamedTuple, Collection, Any, TypeVar

from pydantic import BaseModel, model_validator, ValidationError

from core_utilities import CustomHTTPException, HTTPStatus, CustomRequest

__all__ = (
    "FieldValidation",
    "specific_field_validator",
    "validate_client_data",
    "parse_json_content",
)


class FieldValidation(NamedTuple):
    props: Collection[str]
    type_prop: str
    required_types: Collection[Any]


def specific_field_validator(validations: Collection[FieldValidation]):
    @model_validator(mode="after")
    def check_specific(self):
        for validation in validations:
            for prop in validation.props:
                type_value = getattr(self, validation.type_prop)
                prop_value = getattr(self, prop)
                assert not (
                    prop_value is None and type_value in validation.required_types
                ), f"{prop} must be specified when {validation.type_prop} is {type_value}"
        return self

    return check_specific


_MODEL: TypeVar = TypeVar("_MODEL", bound=BaseModel)


def validate_client_data(model: type[_MODEL], data: Any) -> _MODEL:
    try:
        return model.model_validate(data)
    except ValidationError as e:
        raise CustomHTTPException.only_explain(HTTPStatus.BAD_REQUEST, e.errors())


async def parse_json_content(request: CustomRequest, model: type[_MODEL]) -> _MODEL:
    if request.content_type != "application/json":
        raise CustomHTTPException.only_explain(
            HTTPStatus.BAD_REQUEST, "Expected JSON body"
        )
    try:
        data = await request.json()
    except json.JSONDecodeError as e:
        raise CustomHTTPException.only_explain(
            HTTPStatus.BAD_REQUEST, f"Invalid JSON body: {e}"
        )

    return validate_client_data(model, data)
