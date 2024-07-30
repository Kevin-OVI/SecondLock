import asyncio
import logging
import os.path
import ssl
import sys

from aiohttp import web_runner

import module_loader
from config import SSL_PRIVKEY, SSL_PUBKEY, HTTP_PORT, HTTPS_PORT
from core_utilities import cancel_tasks
from core_utilities.functions import ainput
from logger import DayFileHandler
from web_server import WebApplication

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s %(levelname)s]: [%(name)s] %(message)s",
        handlers=(logging.StreamHandler(sys.stdout), DayFileHandler("logs", logging.INFO)))
    loop = asyncio.new_event_loop()

    modules_manager = module_loader.ModulesManager()

    app = WebApplication(modules_manager, loop)

    servers = []
    if HTTP_PORT:
        servers.append(app.run(HTTP_PORT, None))
    if HTTPS_PORT:
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(SSL_PUBKEY, SSL_PRIVKEY)
        servers.append(app.run(HTTPS_PORT, ssl_context))

    app_run_tasks: tuple[asyncio.Task[None], ...] = tuple(loop.create_task(x) for x in servers)


    async def runner():
        try:
            await modules_manager.load_modules()
        except Exception as e:
            logging.critical(
                "Exception occured while loading modules", exc_info=e)
            logging.critical("Continue running ? (y/N)")
            while True:
                inp = (await ainput("> ")).strip().upper()
                if inp == "Y":
                    break
                if inp == "N" or not inp:
                    from aiohttp.web_runner import GracefulExit
                    raise GracefulExit from None
                logging.critical("Unknown option. Choose Yes (Y) or No (N)")
        modules_manager.ready.set()
        await asyncio.gather(*app_run_tasks)

        try:
            while True:
                await asyncio.sleep(3600)
        finally:
            await modules_manager.unload()
            await modules_manager.dispatch_event("stop")


    main_task = loop.create_task(runner())
    try:
        asyncio.set_event_loop(loop)
        loop.run_forever()
    except (web_runner.GracefulExit, KeyboardInterrupt):
        logging.info("Received signal to shutdown server")
    finally:
        cancel_tasks({main_task}, loop)
        cancel_tasks(asyncio.all_tasks(loop), loop)
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
