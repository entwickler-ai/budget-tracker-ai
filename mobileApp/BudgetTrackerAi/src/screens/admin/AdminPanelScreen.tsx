//BudgetTrackerAi/src/screens/admin/AdminPanelScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Platform,
    Modal,
    ScrollView,
    Animated,
    ViewStyle,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { db } from '@services/firebase';
import { useUserRole } from '@hooks/useUserRole';
import Button from '@components/Button';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: any;
    lastLogin?: any;
}

type RootStackParamList = {
    App: undefined;
    AdminPanel: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'AdminPanel'>;

const AdminPanelScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { role, loading: roleLoading } = useUserRole();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'role'>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userDetailsVisible, setUserDetailsVisible] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const Toast = ({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) => {
        const [fadeAnim] = useState(new Animated.Value(0));

        useEffect(() => {
            if (visible) {
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();

                const timer = setTimeout(() => {
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => onHide());
                }, 3000);

                return () => clearTimeout(timer);
            }
        }, [visible, fadeAnim, onHide]);

        if (!visible) return null;

        return (
            <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
                <Text style={styles.toastText}>{message}</Text>
            </Animated.View>
        );
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersCollection = collection(db, 'users');
            const userQuery = query(usersCollection, orderBy(sortBy, sortDirection));
            const querySnapshot = await getDocs(userQuery);

            const userList: User[] = [];
            querySnapshot.forEach((doc) => {
                const userData = doc.data() as Omit<User, 'id'>;
                userList.push({
                    id: doc.id,
                    ...userData,
                });
            });

            setUsers(userList);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (role !== 'ADMIN') return;

        const usersCollection = collection(db, 'users');
        const recentUsersQuery = query(
            usersCollection,
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(recentUsersQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newUserData = change.doc.data() as Omit<User, 'id'>;
                    const newUser = {
                        id: change.doc.id,
                        ...newUserData,
                    };

                    const isNewRegistration = new Date().getTime() - newUserData.createdAt.toDate().getTime() < 60000;

                    if (isNewRegistration) {
                        setToastMessage(`${newUserData.name || 'A new user'} just registered with email ${newUserData.email}`);
                        setToastVisible(true);

                        setUsers((prevUsers) => {
                            if (prevUsers.some(user => user.id === newUser.id)) {
                                return prevUsers;
                            }
                            return [newUser, ...prevUsers];
                        });
                    }
                }
            });
        }, (error) => {
            console.error("Error in user subscription:", error);
        });

        return () => unsubscribe();
    }, [role]);

    useEffect(() => {
        if (role === 'ADMIN') {
            fetchUsers();
        }
    }, [role, sortBy, sortDirection]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const toggleSortDirection = () => {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    };

    const updateSortBy = (newSortBy: 'name' | 'createdAt' | 'role') => {
        if (sortBy === newSortBy) {
            toggleSortDirection();
        } else {
            setSortBy(newSortBy);
            setSortDirection('asc');
        }
    };

    const toggleUserRole = async (userId: string, currentRole: string) => {
        try {
            const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { role: newRole });

            setUsers(users.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            ));

            setToastMessage(`User role updated to ${newRole}`);
            setToastVisible(true);
        } catch (error) {
            console.error('Error updating user role:', error);
            Alert.alert('Error', 'Failed to update user role');
        }
    };

    const deleteUser = async (userId: string) => {
        Alert.alert(
            'Delete User',
            'Are you sure you want to delete this user? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', userId));
                            setUsers(users.filter(user => user.id !== userId));
                            if (selectedUser?.id === userId) {
                                setSelectedUser(null);
                                setUserDetailsVisible(false);
                            }
                            setToastMessage('User deleted successfully');
                            setToastVisible(true);
                        } catch (error) {
                            console.error('Error deleting user:', error);
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const showUserDetails = (user: User) => {
        setSelectedUser(user);
        setUserDetailsVisible(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            user.email.toLowerCase().includes(searchText.toLowerCase());

        const matchesFilter = activeFilter ? user.role === activeFilter : true;

        return matchesSearch && matchesFilter;
    });

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    };

    if (roleLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading...</Text>
            </SafeAreaView>
        );
    }

    if (role !== 'ADMIN') {
        return (
            <SafeAreaView style={styles.unauthorizedContainer}>
                <Ionicons name="warning-outline" size={64} color="#FF3B30" />
                <Text style={styles.unauthorizedText}>
                    You do not have permission to access this page.
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => navigation.navigate('App')}
                    style={styles.backButton}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Toast
                message={toastMessage}
                visible={toastVisible}
                onHide={() => setToastVisible(false)}
            />
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('App')}
                >
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                    {searchText !== '' && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.filterContainer}>
                <Text style={styles.filterTitle}>Filter by:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollView}>
                    <ScrollableChip
                        label="All"
                        active={activeFilter === null}
                        onPress={() => setActiveFilter(null)}
                    />
                    <ScrollableChip
                        label="Admin"
                        active={activeFilter === 'ADMIN'}
                        onPress={() => setActiveFilter('ADMIN')}
                    />
                    <ScrollableChip
                        label="User"
                        active={activeFilter === 'USER'}
                        onPress={() => setActiveFilter('USER')}
                    />
                </ScrollView>
            </View>

            <View style={styles.listHeader}>
                <TouchableOpacity
                    style={[styles.listHeaderItem, { flex: 2 }]}
                    onPress={() => updateSortBy('name')}
                >
                    <Text style={styles.listHeaderText}>Name</Text>
                    {sortBy === 'name' && (
                        <Ionicons
                            name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color="#007AFF"
                        />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.listHeaderItem, { flex: 1 }]}
                    onPress={() => updateSortBy('role')}
                >
                    <Text style={styles.listHeaderText}>Role</Text>
                    {sortBy === 'role' && (
                        <Ionicons
                            name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color="#007AFF"
                        />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.listHeaderItem, { flex: 2 }]}
                    onPress={() => updateSortBy('createdAt')}
                >
                    <Text style={styles.listHeaderText}>Registered</Text>
                    {sortBy === 'createdAt' && (
                        <Ionicons
                            name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color="#007AFF"
                        />
                    )}
                </TouchableOpacity>
                <View style={[styles.listHeaderItem, { flex: 1 }]}>
                    <Text style={styles.listHeaderText}>Actions</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading users...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.userItem}
                            onPress={() => showUserDetails(item)}
                        >
                            <View style={[styles.userItemColumn, { flex: 2 }]}>
                                <Text style={styles.userName}>{item.name || 'No Name'}</Text>
                                <Text style={styles.userEmail}>{item.email}</Text>
                            </View>
                            <View style={[styles.userItemColumn, { flex: 1, alignItems: 'center' }]}>
                                <View style={[
                                    styles.roleBadge,
                                    item.role === 'ADMIN' ? styles.adminBadge : styles.userBadge
                                ]}>
                                    <Text style={styles.roleBadgeText}>{item.role}</Text>
                                </View>
                            </View>
                            <View style={[styles.userItemColumn, { flex: 2 }]}>
                                <Text style={styles.dateText}>
                                    {formatDate(item.createdAt)}
                                </Text>
                            </View>
                            <View style={[styles.userItemColumn, { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' }]}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={() => toggleUserRole(item.id, item.role)}
                                >
                                    <MaterialIcons name="swap-horiz" size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => deleteUser(item.id)}
                                >
                                    <MaterialIcons name="delete-outline" size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No users found</Text>
                        </View>
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}

            <Modal
                visible={userDetailsVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setUserDetailsVisible(false)}
            >
                {selectedUser && (
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>User Details</Text>
                                <TouchableOpacity onPress={() => setUserDetailsVisible(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.userDetailItem}>
                                <Text style={styles.detailLabel}>ID:</Text>
                                <Text style={styles.detailValue}>{selectedUser.id}</Text>
                            </View>

                            <View style={styles.userDetailItem}>
                                <Text style={styles.detailLabel}>Name:</Text>
                                <Text style={styles.detailValue}>{selectedUser.name || 'No Name'}</Text>
                            </View>

                            <View style={styles.userDetailItem}>
                                <Text style={styles.detailLabel}>Email:</Text>
                                <Text style={styles.detailValue}>{selectedUser.email}</Text>
                            </View>

                            <View style={styles.userDetailItem}>
                                <Text style={styles.detailLabel}>Role:</Text>
                                <View style={[
                                    styles.roleBadge,
                                    selectedUser.role === 'ADMIN' ? styles.adminBadge : styles.userBadge
                                ]}>
                                    <Text style={styles.roleBadgeText}>{selectedUser.role}</Text>
                                </View>
                            </View>

                            <View style={styles.userDetailItem}>
                                <Text style={styles.detailLabel}>Registered:</Text>
                                <Text style={styles.detailValue}>{formatDate(selectedUser.createdAt)}</Text>
                            </View>

                            <View style={styles.userDetailItem}>
                                <Text style={styles.detailLabel}>Last Login:</Text>
                                <Text style={styles.detailValue}>
                                    {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Never'}
                                </Text>
                            </View>

                            <View style={styles.modalButtonsContainer}>
                                <Button
                                    title={`Make ${selectedUser.role === 'ADMIN' ? 'User' : 'Admin'}`}
                                    onPress={() => {
                                        toggleUserRole(selectedUser.id, selectedUser.role);
                                        setUserDetailsVisible(false);
                                    }}
                                    style={styles.modalButton}
                                    variant="outline"
                                />
                                <Button
                                    title="Delete User"
                                    onPress={() => {
                                        setUserDetailsVisible(false);
                                        deleteUser(selectedUser.id);
                                    }}
                                    style={styles.deleteUserButton}
                                    variant="outline"
                                />
                            </View>
                        </View>
                    </View>
                )}
            </Modal>
        </SafeAreaView>
    );
};

interface ScrollableChipProps {
    label: string;
    active: boolean;
    onPress: () => void;
}

const ScrollableChip = ({ label, active, onPress }: ScrollableChipProps) => (
    <TouchableOpacity
        style={[
            styles.filterChip,
            active && styles.activeFilterChip
        ]}
        onPress={onPress}
    >
        <Text
            style={[
                styles.filterChipText,
                active && styles.activeFilterChipText
            ]}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6B7280',
    },
    unauthorizedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    unauthorizedText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        marginVertical: 20,
    },
    backButton: {
        marginTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: '#1F2937',
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterScrollView: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 12,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    activeFilterChip: {
        backgroundColor: '#DBEAFE',
    },
    filterChipText: {
        fontSize: 14,
        color: '#4B5563',
    },
    activeFilterChipText: {
        color: '#2563EB',
        fontWeight: '500',
    },
    listHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    listHeaderItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    listHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 4,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    userItemColumn: {
        paddingHorizontal: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    userEmail: {
        fontSize: 14,
        color: '#6B7280',
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    adminBadge: {
        backgroundColor: '#10B981',
    },
    userBadge: {
        backgroundColor: '#3B82F6',
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    dateText: {
        fontSize: 11,
        color: '#6B7280',
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    editButton: {
        backgroundColor: '#3B82F6',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    userDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        width: 100,
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 4,
    } as ViewStyle,
    deleteUserButton: {
        flex: 1,
        marginHorizontal: 4,
        backgroundColor: '#EF4444',
    } as ViewStyle,
    toastContainer: {
        position: 'absolute',
        top: 100,
        left: 40,
        right: 20,
        backgroundColor: '#10B981',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
        width: '80%',
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AdminPanelScreen;