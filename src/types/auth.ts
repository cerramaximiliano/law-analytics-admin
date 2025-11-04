import { ReactElement } from "react";
import { CredentialResponse } from "@react-oauth/google";
import { Subscription } from "./user";
import { Payment } from "store/reducers/ApiService";

// ==============================|| TYPES - AUTH  ||============================== //

export type GuardProps = {
	children: ReactElement | null;
};

// Definimos la interfaz para el objeto de colegio con matrícula
interface LawyerCollegeWithRegistration {
	_id?: string;
	name: string;
	registrationNumber: string;
	taxCondition: "autonomo" | "monotributo" | "";
	taxCode: string;
	electronicAddress: string;
}

// Definimos el tipo para las skills que pueden ser string[] o LawyerCollegeWithRegistration[]
type UserSkills = string[] | LawyerCollegeWithRegistration[];

export type UserProfile = {
	_id?: string;
	groupId?: string;
	address?: string;
	address1?: string;
	avatar?: string;
	contact?: string;
	country?: string;
	designation?: string;
	dob?: string;
	email?: string;
	firstName?: string;
	id?: string;
	image?: string;
	lastName?: string;
	name?: string;
	note?: string;
	picture?: string;
	role?: string;
	skill?: UserSkills;
	state?: string;
	subscription?: string;
	tier?: string;
	users?: User[];
	url?: string;
	zipCode?: string;
	isVerified?: boolean;
	profileCompletionScore?: number;
};

type User = {
	userId: string;
	name: string;
	email: string;
	role: string;
	status: string;
	avatar?: string;
};

export interface AuthProps {
	isLoggedIn: boolean;
	isInitialized: boolean;
	user?: UserProfile | null;
	email?: string;
	token?: string | null;
	needsVerification?: boolean;
	plan?: string;
	subscription?: Subscription | null;
	paymentHistory?: Payment[] | null;
	customer?: {
		id: string;
		email: string | null;
	} | null;
}

export interface AuthActionProps {
	type: string;
	payload?: {
		user?: UserProfile;
		email?: string;
		needsVerification?: boolean;
		isLoggedIn?: boolean;
		isInitialized?: boolean;
		picture?: string;
		subscription?: Subscription;
		paymentHistory?: Payment[];
		customer?: {
			id: string;
			email: string | null;
		};
		skills?: UserSkills;
	};
}

export interface InitialLoginContextProps {
	isLoggedIn: boolean;
	isInitialized?: boolean;
	user?: UserProfile | null | undefined;
}

export interface JWTDataProps {
	userId: string;
}

// Interfaces para respuestas de la API
export interface LoginResponse {
	user: UserProfile;
	success?: boolean;
	message?: string;
	accessToken?: string;
	refreshToken?: string;
	needsVerification?: boolean;
	subscription?: Subscription;
	paymentHistory?: Payment[];
	customer?: {
		id: string;
		email: string | null;
	};
}

export interface RegisterResponse {
	user: UserProfile;
	token?: string;
	needsVerification: boolean;
}

export interface VerifyCodeResponse {
	success: boolean;
	message: string;
	user?: UserProfile; // Información del usuario después de la verificación
	subscription?: Subscription; // Información de la suscripción
	paymentHistory?: Payment[]; // Historial de pagos
	customer?: {
		id: string;
		email: string | null;
	}; // Información del cliente
}

// Interfaz actualizada para el contexto del servidor
export interface ServerContextType extends AuthProps {
	login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
	logout: (showMessage?: boolean) => Promise<void>;
	register: (email: string, password: string, firstName: string, lastName: string, recaptchaToken?: string) => Promise<void>;
	googleLogin?: (tokenResponse: CredentialResponse) => Promise<void>;
	loginWithGoogle?: (tokenResponse: CredentialResponse) => Promise<void>;
	verifyCode?: (email: string, code: string) => Promise<void>;
	updateProfile: (userData: Partial<UserProfile>) => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
}

export interface UnauthorizedModalProps {
	open: boolean;
	onClose: () => void;
	onLogin: (email: string, password: string) => Promise<boolean>;
	onGoogleLogin: (response: CredentialResponse) => Promise<boolean>;
	onLogout: () => void;
}

export interface FormValues {
	email: string;
	password: string;
	submit: string | null;
}
