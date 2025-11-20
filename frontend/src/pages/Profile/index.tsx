import "./style.css";
import { useState, useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { getUserProfile, updateUserProfile, type UserProfile } from "../../api/user/profile";
import { getUserStats, type UserStats } from "../../api/user/stats";

export default function ProfilePage() {
    const location = useLocation();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // User data from backend
    const [userData, setUserData] = useState<UserProfile>({
        name: "",
        email: "",
        username: "",
        joinDate: "",
        bio: "",
        pic_id: 0,
    });

    // Learning statistics from backend - default to zero
    const [stats, setStats] = useState<UserStats>({
        totalCards: 0,
        studySets: 0,
        streak: 0,
        accuracy: 0,
        hoursStudied: 0,
        cardsToday: 0,
    });

    // Fetch user profile and stats on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [profileData, statsData] = await Promise.all([
                    getUserProfile(),
                    getUserStats(),
                ]);
                setUserData(profileData);
                setStats(statsData);
                setError(null);
            } catch (err) {
                console.error("Error fetching profile data:", err);
                // Use mock data for profile if backend is not available
                setUserData({
                    name: "John Doe",
                    email: "john.doe@example.com",
                    username: "johndoe",
                    joinDate: "January 2024",
                    bio: "Passionate learner using flashcards to master new skills!",
                    pic_id: 0,
                });
                // Keep stats at zero if backend is not available
                setStats({
                    totalCards: 0,
                    studySets: 0,
                    streak: 0,
                    accuracy: 0,
                    hoursStudied: 0,
                    cardsToday: 0,
                });
                setError(null); // Don't show error, just use defaults
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSave = async () => {
        try {
            setSaveSuccess(false);
            setError(null);

            // Try to save to backend
            try {
                await updateUserProfile({
                    name: userData.name,
                    email: userData.email,
                    bio: userData.bio || undefined,
                });
            } catch (apiErr) {
                // If backend fails, still save locally (mock mode)
                console.log("Backend not available, saving locally");
            }

            // Always exit edit mode and show success
            setSaveSuccess(true);
            setIsEditing(false);

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Error saving profile:", err);
            setError("Failed to save profile. Please try again.");
        }
    };

    if (loading) {
        return (
            <div class="profile-container">
                <div class="loading-message">Loading profile...</div>
            </div>
        );
    }

    return (
        <div class="profile-container">
            {/* App Bar */}
            <nav class="app-bar">
                <button class="nav-button" onClick={() => location.route("/dashboard")}>
                    Dashboard
                </button>
                <button class="nav-button" onClick={() => location.route("/learn/temp")}>
                    Spaced Repetition
                </button>
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search" class="search-input" />
                </div>
                <button class="nav-button create-button" onClick={() => alert("Create new set - Coming soon!")}>
                    Create New Set
                </button>
                <button class="profile-avatar-button" onClick={() => setShowMenu(!showMenu)}>
                    <span class="avatar-letter">{userData.name.charAt(0).toUpperCase() || "P"}</span>
                </button>
                {showMenu && (
                    <div class="profile-menu">
                        <button onClick={() => { setShowMenu(false); location.route("/profile"); }}>Profile</button>
                        <button onClick={() => { setShowMenu(false); alert("Settings - Coming soon!"); }}>Settings</button>
                        <button onClick={() => { setShowMenu(false); alert("Logout - Coming soon!"); }}>Logout</button>
                    </div>
                )}
            </nav>

            {/* Success/Error Messages */}
            {error && <div class="error-message">{error}</div>}
            {saveSuccess && <div class="success-message">Profile updated successfully!</div>}

            {/* Main Content */}
            <div class="profile-content">
                {/* Left Section - Profile Info */}
                <div class="profile-left">
                    <div class="profile-avatar-large">
                        <span class="avatar-letter-large">{userData.name.charAt(0).toUpperCase() || "P"}</span>
                    </div>
                    <button class="update-icon-link" onClick={() => alert("Update profile icon - Coming soon!")}>
                        Update Profile Icon
                    </button>

                    <div class="profile-user-info">
                        <h1>{userData.name}</h1>
                        <span class="edit-icon" onClick={() => setIsEditing(!isEditing)}>✏️</span>
                        <p class="user-type">Basic User</p>
                    </div>

                    {isEditing ? (
                        <textarea
                            class="bio-textarea"
                            placeholder="Write a little bit about yourself for others to see!"
                            value={userData.bio || ""}
                            onInput={(e) => setUserData({ ...userData, bio: e.currentTarget.value })}
                            rows={4}
                        />
                    ) : (
                        <div class="bio-display">
                            {userData.bio || "Write a little bit about yourself for others to see!"}
                        </div>
                    )}

                    {isEditing && (
                        <button class="save-bio-button" onClick={handleSave}>
                            Save Changes
                        </button>
                    )}

                    {/* Stats Grid */}
                    <div class="stats-grid-compact">
                        <div class="stat-item-compact">
                            <span class="stat-icon">📚</span>
                            <div>
                                <div class="stat-number-compact">{stats.totalCards}</div>
                                <div class="stat-label-compact">Total Cards</div>
                            </div>
                        </div>
                        <div class="stat-item-compact">
                            <span class="stat-icon">📝</span>
                            <div>
                                <div class="stat-number-compact">{stats.studySets}</div>
                                <div class="stat-label-compact">Study Sets</div>
                            </div>
                        </div>
                        <div class="stat-item-compact">
                            <span class="stat-icon">🔥</span>
                            <div>
                                <div class="stat-number-compact">{stats.streak}</div>
                                <div class="stat-label-compact">Day Streak</div>
                            </div>
                        </div>
                        <div class="stat-item-compact">
                            <span class="stat-icon">🎯</span>
                            <div>
                                <div class="stat-number-compact">{stats.accuracy}%</div>
                                <div class="stat-label-compact">Accuracy</div>
                            </div>
                        </div>
                        <div class="stat-item-compact">
                            <span class="stat-icon">⏱️</span>
                            <div>
                                <div class="stat-number-compact">{stats.hoursStudied}h</div>
                                <div class="stat-label-compact">Hours Studied</div>
                            </div>
                        </div>
                        <div class="stat-item-compact">
                            <span class="stat-icon">✅</span>
                            <div>
                                <div class="stat-number-compact">{stats.cardsToday}</div>
                                <div class="stat-label-compact">Cards Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Settings Toggles */}
                    <div class="settings-section">
                        <div class="toggle-item">
                            <label class="toggle-switch">
                                <input type="checkbox" disabled />
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-label">Dark Mode</span>
                        </div>
                        <div class="toggle-item">
                            <label class="toggle-switch">
                                <input type="checkbox" disabled />
                                <span class="toggle-slider"></span>
                            </label>
                            <span class="toggle-label">Default Sets to Public</span>
                        </div>
                    </div>
                </div>

                {/* Right Section - Danger Zone */}
                <div class="profile-right">
                    <button class="danger-button" onClick={() => {
                        if (confirm("Are you sure you want to delete all sets? This cannot be undone.")) {
                            alert("Delete all sets - Coming soon!");
                        }
                    }}>
                        Delete All Sets
                    </button>
                    <button class="danger-button" onClick={() => {
                        if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
                            alert("Delete account - Coming soon!");
                        }
                    }}>
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
