import { useEffect, useRef, useState } from "react";
import useAppContext from "../../utils/context/Context";
import styles from "./index.module.css";
import { AddSiteButtons } from "./AddSiteButtons";
import SiteElement, { Site } from "./SiteElement";
import { FieldErrors, InputSite } from "./AddOrEditSiteModal";

function SiteListLoading() {
  return <div className={styles.siteListLoading}>Chargement...</div>;
}

function SiteListEmpty() {
  return <div className={styles.siteListEmpty}>Aucun site</div>;
}

export default function SiteList() {
  const [{ api }, dispatch] = useAppContext();
  const [sites, setSites] = useState<Site[]>();
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

  async function handleCreateOrUpdateSite({ id, name, secret }: InputSite, errors: FieldErrors): Promise<boolean> {
    const res = id
      ? await api.fetchAPIRaiseStatus("PATCH", `/sites/${id}`, { json: { name, secret } })
      : await api.fetchAPIRaiseStatus("POST", "/sites", { json: { name, secret } });

    if (!res) return false;

    if (res.status === 200 || res.status === 201) {
      delete res.json.next_update;
      const site: Site = res.json;

      if (id) updateExistingSite(site);
      else addNewSite(site);
      return true;
    }
    if (res.status === 422) {
      errors.secret = "Clé secrète invalide.";
    } else {
      alert(`Erreur ${res.status} : ${res.json.explain}`);
    }
    return false;
  }

  useEffect(() => {
    let timeoutId: number;
    let animation: Animation;

    async function fetchSites() {
      const res = await api.fetchAPIRaiseStatus("GET", "/sites");
      if (!res) return;

      if (res.status === 200) {
        const { sites, next_update: nextUpdate }: { sites: Site[]; next_update: number } = res.json;
        setSites(sites);
        const nextUpdateMs = Math.round(nextUpdate * 1000);
        if (refreshAnimationRef.current) {
          animation = refreshAnimationRef.current.animate([{ inset: "0 100% 0 0" }, { inset: "0" }], {
            duration: 30000,
            fill: "forwards",
          });
          animation.currentTime = 30000 - nextUpdateMs;
        }
        timeoutId = setTimeout(() => fetchSites().catch(console.error), nextUpdateMs);
      } else {
        alert(`Erreur ${res.status} : ${res.json.explain}`);
      }
    }

    fetchSites().catch(console.error);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (animation) {
        animation.cancel();
      }
    };
  }, [api, dispatch]);

  return (
    <div className={styles.siteList}>
      <header className={styles.header}>
        <img className={styles.logo} src="/logo_full.svg" alt="Logo" />
      </header>
      <div className={styles.refreshTimer}>
        <div ref={refreshAnimationRef}></div>
      </div>

      {sites ? (
        sites.length > 0 ? (
          <div className={styles.accountList}>
            {sites.map((site) => (
              <SiteElement key={`${site.id}`} site={site} handleRemoveSite={handleRemoveSite} updateSiteCallback={handleCreateOrUpdateSite} />
            ))}
          </div>
        ) : (
          <SiteListEmpty />
        )
      ) : (
        <SiteListLoading />
      )}

      <AddSiteButtons callback={handleCreateOrUpdateSite} />
    </div>
  );
}
