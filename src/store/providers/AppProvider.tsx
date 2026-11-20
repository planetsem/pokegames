import { useEffect } from "react";
import { Global } from "@emotion/react";
import { Toaster, toast } from "react-hot-toast";
import NoSignal from "@/components/ui/NoSignal";
import { globalStyle } from "@/styles/global.style";
import { useOnlineStatus } from "@/hooks/common/useOnlineStatus";
import { useAuthStore } from "@/store/app/authStore";

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider = ({ children }: AppProviderProps) => {
  const isOnline = useOnlineStatus();

  useEffect(() => useAuthStore.getState().init(), []);

  useEffect(() => {
    if (!isOnline) {
      toast(() => <NoSignal />, {
        position: "top-right",
        duration: 50000,
        id: "offline-toast",
      });
    } else {
      toast.dismiss("offline-toast");
    }

    return () => {
      toast.dismiss("offline-toast");
    };
  }, [isOnline]);

  return (
    <>
      <Global styles={globalStyle} />
      {children}
      <Toaster position="top-right" />
    </>
  );
};

export default AppProvider;
