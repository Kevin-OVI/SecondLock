import {useCallback, useEffect, useRef, useState} from "react";
import styles from "./index.module.css";
import {AddSiteButtons, InputSite} from "./AddSiteButtons";
import SiteElement, {Site} from "./SiteElement";
import {CircularProgress} from "@mui/material";
import {FieldErrors} from "../../utils/types.ts";
import useAppContext from "../../utils/context/useAppContext.ts";

function SiteListLoading() {
  return <div className={styles.listContentMessage}>
    <CircularProgress/>
  </div>;
}

function SiteListEmpty() {
  return <div className={styles.listContentMessage}>
    <div>
      <h2>Bienvenue sur SecondLock</h2>
      <p>Ajoutez votre premier compte en utilisant le bouton en bas à droite</p>
    </div>
  </div>;
}

export default function SiteList() {
  const [{api}] = useAppContext();
  const [sites, setSites] = useState<Site[]>();
  const [nextUpdateAt, setNextUpdateAt] = useState<number | null>(0);
  const refreshAnimationRef = useRef<HTMLDivElement>(null);

  function handleRemoveSite(id: number) {
    setSites((prev) => {
      if (prev === undefined) {
        return undefined;
      }
      return prev.filter((site) => site.id !== id);
    });
  }

  function addNewSite(site: Site) {
    setSites((prev) => {
      if (prev === undefined) {
        return undefined;
      }
      return [...prev, site];
    });
  }

  function updateExistingSite(site: Site) {
    setSites((prev) => {
      if (prev === undefined) {
        return undefined;
      }
      return prev.map((s) => (s.id === site.id ? site : s));
    });
  }

  async function handleCreateOrUpdateSite({id, name, secret}: InputSite, errors: FieldErrors): Promise<boolean> {
    const res = id
      ? await api.fetchAPIRaiseStatus("PATCH", `/sites/${id}`, {json: {name, secret}})
      : await api.fetchAPIRaiseStatus("POST", "/sites", {json: {name, secret}});

    if (!res) return false;

    if (res.status === 200 || res.status === 201) {
      const {next_update: nextUpdate, ...site} = res.json;
      if (id) updateExistingSite(site);
      else addNewSite(site);
      setNextUpdateAt(new Date().getTime() + Math.round(nextUpdate * 1000));
      return true;
    }
    if (res.status === 422) {
      errors.secret = "Clé secrète invalide.";
    } else {
      alert(`Erreur ${res.status} : ${res.json.explain}`);
    }
    return false;
  }

  const fetchSites = useCallback(async () => {
    const res = await api.fetchAPIRaiseStatus("GET", "/sites");
    if (!res) return null;

    if (res.status === 200) {
      const {sites, next_update: nextUpdate}: { sites: Site[]; next_update: number } = res.json;
      setSites(sites);
      return Math.round(nextUpdate * 1000);
    } else {
      alert(`Erreur ${res.status} : ${res.json.explain}`);
    }
    return null;
  }, [api]);

  useEffect(() => {
    async function onExpireUpdate() {
      let nextUpdateIn = 5000;
      try {
        const ret = await fetchSites();
        if (ret != null) {
          nextUpdateIn = ret;
        }
      } finally {
        if (nextUpdateIn == -1) {
          setNextUpdateAt(null);
        } else {
          setNextUpdateAt(new Date().getTime() + nextUpdateIn);
        }
      }
    }

    if (nextUpdateAt == null) {
      return;
    }

    const now = new Date().getTime();
    if (nextUpdateAt < now) {
      onExpireUpdate().catch(console.error);
      return;
    }

    const timeout = setTimeout(onExpireUpdate, nextUpdateAt - now);
    let animation: Animation | null = null;

    if (refreshAnimationRef.current) {
      animation = refreshAnimationRef.current.animate([{inset: "0 100% 0 0"}, {inset: "0"}], {
        duration: 30000,
        fill: "forwards",
      });
      animation.currentTime = 30000 - (nextUpdateAt - now);
    }

    return () => {
      clearTimeout(timeout);
      if (animation) {
        animation.cancel();
      }
    };
  }, [fetchSites, nextUpdateAt, refreshAnimationRef]);

  return (
    <>
      {sites ? (
        sites.length > 0 ? (
          <>
            <div className={styles.refreshTimer}>
              <div ref={refreshAnimationRef}></div>
            </div>
            <div className={styles.accountList}>
              {sites.map((site) => (
                <SiteElement key={`${site.id}`} site={site} handleRemoveSite={handleRemoveSite} updateSiteCallback={handleCreateOrUpdateSite}/>
              ))}
            </div>
          </>
        ) : (
          <SiteListEmpty/>
        )
      ) : (
        <SiteListLoading/>
      )}

      <AddSiteButtons callback={handleCreateOrUpdateSite}/>
    </>
  );
}
