import { useEffect, useState } from "react";
import {useNavigate} from "react-router-dom"
import { apiFetch, setAccessToken} from "./lib/apiFetch";

export default function OAuthCallback() {   
    const navigate = useNavigate();
    const [err, setErr] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch("/api/auth/refresh", {
                    method: "POST",
                    credential: "include",
                });

                if (!res.ok) {
                    setErr("네트워크 오류");
                    return;
                }

                const data = await res.json();
                setAccessToken(data.accessToken);
                navigate("/");
            } catch(e) {
                setErr("네트워크 오류");
            }
        })();                
    },[navigate])
    return <div> login... </div>;
}