"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { dashboardApi } from "@/lib/api";
import { toast } from "sonner";

interface Activity {
  id: number;
  action: string;
  description: string;
  icon: string;
  createdAt: string;
  user: { nome: string };
}

interface UserProfileData {
  nome: string;
  mail: string;
  userName: string;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const [profileData, setProfileData] = useState<UserProfileData>({
    nome: user?.nome || "",
    mail: user?.mail || "",
    userName: user?.userName || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        nome: user.nome,
        mail: user.mail,
        userName: user.userName,
      });
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      const activitiesData = await dashboardApi.getActivities();
      setActivities(activitiesData);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      // API call to update user profile
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const updatedUser = await response.json();
      updateUser(updatedUser);
      toast.success("Profilo aggiornato con successo");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Errore durante l'aggiornamento del profilo");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast.success("Password modificata con successo");
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Errore durante la modifica della password");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      create: "plus-circle",
      update: "edit",
      delete: "trash",
      login: "sign-in-alt",
      logout: "sign-out-alt",
      export: "file-export",
      import: "file-import",
    };
    return iconMap[icon] || "circle";
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      create: "text-green-500",
      update: "text-blue-500",
      delete: "text-red-500",
      login: "text-purple-500",
      logout: "text-gray-500",
      export: "text-indigo-500",
      import: "text-yellow-500",
    };
    return colorMap[action] || "text-gray-500";
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
          Profilo Utente
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Gestisci le tue informazioni personali e visualizza le tue attività
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                <i className="fas fa-user mr-2 text-blue-500"></i>
                Informazioni Personali
              </h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <i className="fas fa-edit mr-2"></i>
                  Modifica
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        nome: user?.nome || "",
                        mail: user?.mail || "",
                        userName: user?.userName || "",
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Annulla
                  </button>
                  <button
                    onClick={handleProfileUpdate}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    <i className="fas fa-save mr-2"></i>
                    {loading ? "Salvataggio..." : "Salva"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profileData.nome}
                  onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={profileData.userName}
                  onChange={(e) => setProfileData({ ...profileData, userName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.mail}
                  onChange={(e) => setProfileData({ ...profileData, mail: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Change Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <i className={`fas fa-${showPasswordChange ? 'chevron-up' : 'key'} mr-2`}></i>
                {showPasswordChange ? "Nascondi modifica password" : "Modifica Password"}
              </button>

              {showPasswordChange && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password Attuale
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nuova Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Conferma Nuova Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={handlePasswordChange}
                    disabled={loading}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    <i className="fas fa-save mr-2"></i>
                    {loading ? "Salvataggio..." : "Cambia Password"}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-history mr-2 text-blue-500"></i>
              Le Mie Attività
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Le tue ultime operazioni
            </p>

            {activitiesLoading ? (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mx-auto h-8 w-8 rounded-full border-2 border-solid border-blue-500 border-t-transparent"
                />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nessuna attività registrata
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className={`flex-shrink-0 ${getActionColor(activity.action)}`}>
                      <i className={`fas fa-${getActionIcon(activity.icon)} text-lg`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(activity.createdAt).toLocaleString("it-IT")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
