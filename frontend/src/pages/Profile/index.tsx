import "./style.css";
import { useLocation, useRoute } from "preact-iso";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUserProfile,
  getUserProfile,
  updateUserAdminStatus,
  updateUserProfile,
} from "../../api/user/profile.ts";
import { getSetsByOwner } from "../../api/sets.ts";
import { logout } from "../../api/user/auth.ts";
import { useAuthRedirect } from "../../utils/cookies.ts";
import { useState } from "preact/hooks";
import { SetCard } from "../../components/SetCard.tsx";

export default function ProfilePage() {
  const location = useLocation();
  const { params } = useRoute();
  const profileUsername = params.username as string;
  const { username: currentUsername, isAdmin } = useAuthRedirect(false);
  const queryClient = useQueryClient();

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  //grabs profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", profileUsername],
    queryFn: () => getUserProfile(profileUsername),
    enabled: Boolean(profileUsername),
  });

  const { data: ownedSets = [], isLoading: setsLoading } = useQuery({
    queryKey: ["ownedSets", profileUsername],
    queryFn: () => getSetsByOwner(profileUsername),
    enabled: Boolean(profileUsername),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isOwnProfile = currentUsername === profileUsername;
  const canModifyProfile = isOwnProfile || isAdmin;
  const logoutValid = currentUsername === profileUsername;

  if (isLoading) {
    return (
      <div class="profile-page">
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div class="profile-page">
        <div class="header">
          <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
        </div>
        <p>User not found</p>
      </div>
    );
  }

  const updateDescriptionMutation = useMutation({
    mutationFn: (description: string) =>
      updateUserProfile(profileUsername, { description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileUsername] });
      setIsEditingDescription(false);
    },
  });

  const handleEditDescription = () => {
    setNewDescription(profile?.description || "");
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    if (newDescription.length > 250) {
      alert("Description must be 250 characters or less.");
      return;
    }
    updateDescriptionMutation.mutate(newDescription);
  };

  const deleteProfileMutation = useMutation({
    mutationFn: (username: string) => deleteUserProfile(username),
    onSuccess: () => {
      // If deleting own profile, logout and redirect to login
      if (isOwnProfile) {
        logout();
        location.route("/login");
      } else {
        // If admin deletes another user, go back to dashboard
        location.route("/");
      }
    },
    onError: (error: any) => {
      console.error("Error deleting profile:", error);
      alert(
        `Error deleting profile: ${
          error?.response?.data?.error || error.message
        }`,
      );
    },
  });

  const updateAdminStatusMutation = useMutation({
    mutationFn: (
      { username, isAdmin }: { username: string; isAdmin: boolean },
    ) => updateUserAdminStatus(username, { is_admin: isAdmin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileUsername] });
    },
    onError: (error: any) => {
      console.error("Error updating admin status:", error);
      alert(
        `Error updating admin status: ${
          error?.response?.data?.error || error.message
        }`,
      );
    },
  });

  const handleDeleteProfile = () => {
    if (
      confirm(
        "Are you sure you want to delete your profile? This will also delete all of your sets. This action cannot be undone.",
      )
    ) {
      deleteProfileMutation.mutate(profileUsername);
    }
  };

  const handleToggleAdminStatus = () => {
    const newAdminStatus = !profile?.is_admin; // Toggle current admin status
    const action = newAdminStatus
      ? "promote to admin"
      : "remove admin privileges from";
    const confirmationMessage =
      `Are you sure you want to ${action} ${profileUsername}?`;

    if (confirm(confirmationMessage)) {
      updateAdminStatusMutation.mutate({
        username: profileUsername,
        isAdmin: newAdminStatus,
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    location.route("/login");
  };

  return (
    <div class="profile-page">
      <div class="header">
        <h3 onClick={() => location.route("/")}>🡄 Back to Dashboard</h3>
      </div>
      <div class="profile-header">
        <div class="profile-avatar">
          {"😂"}
        </div>
        <div class="profile-info">
          <h1 class="profile-username">{profileUsername}</h1>
          {profile?.is_admin && <span class="admin-badge">Admin</span>}
        </div>
        {logoutValid && (
          <button type="button" class="logout-button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
      {isOwnProfile && isEditingDescription
        ? (
          <div class="profile-description-box">
            <textarea
              class="description-editor"
              value={newDescription}
              onInput={(e: Event) =>
                setNewDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Enter your description..."
              maxLength={250}
              autoFocus
            />
            <div class="character-count">
              {newDescription.length}/250 characters
            </div>
            <div class="description-actions">
              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={updateDescriptionMutation.isPending}
              >
                {updateDescriptionMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingDescription(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )
        : (
          <div class="profile-description-box">
            <p class="profile-description">
              {profile.description || (isOwnProfile
                ? "No description yet. Click edit to add one."
                : "No description.")}
            </p>
            {canModifyProfile && (
              <button
                type="button"
                class="edit-description-button"
                onClick={handleEditDescription}
              >
                Edit
              </button>
            )}
          </div>
        )}

      <section class="user-sets-section">
        <h2>{profileUsername}'s Sets</h2>
        {setsLoading
          ? <p>Loading sets...</p>
          : ownedSets.length > 0
          ? (
            <div class="set-grid">
              {ownedSets.map((set) => (
                <SetCard
                  key={set.id}
                  set={{
                    title: set.title,
                    owner: profileUsername,
                    id: set.id,
                  }}
                />
              ))}
            </div>
          )
          : <p>No sets created yet.</p>}
      </section>

      {isOwnProfile && (
        <section class="delete-profile">
          <button
            type="button"
            class="delete-profile-button"
            onClick={handleDeleteProfile}
          >
            Delete Profile
          </button>
        </section>
      )}

      {isAdmin && !isOwnProfile && (
        <section class="admin-controls">
          <div class="admin-control-group">
            <h3>Admin Controls</h3>
            <button
              type="button"
              class={`admin-status-toggle ${
                profile?.is_admin ? "remove-admin" : "make-admin"
              }`}
              onClick={handleToggleAdminStatus}
              disabled={updateAdminStatusMutation.isPending}
            >
              {updateAdminStatusMutation.isPending
                ? "Updating..."
                : profile?.is_admin
                ? "Remove Admin Status"
                : "Make Admin"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
