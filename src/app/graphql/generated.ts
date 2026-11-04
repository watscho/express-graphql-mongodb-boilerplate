import type {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig
} from 'graphql'
import type { GraphQLContext } from './context.ts'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  /** A multipart File variable; literals and JSON objects are rejected. */
  File: { input: File; output: never }
}

export type AccessToken = {
  __typename?: 'AccessToken'
  accessToken: Scalars['String']['output']
}

export type CredentialsInput = {
  email: Scalars['String']['input']
  password: Scalars['String']['input']
}

export type DeleteProfileInput = {
  password: Scalars['String']['input']
}

export type EmailTemplate = {
  __typename?: 'EmailTemplate'
  defaultLanguage: Scalars['String']['output']
  key: Scalars['String']['output']
  languages: Array<Scalars['String']['output']>
}

export type Mutation = {
  __typename?: 'Mutation'
  confirmVerification?: Maybe<AccessToken>
  deleteProfile?: Maybe<Success>
  newPassword?: Maybe<AccessToken>
  requestVerification?: Maybe<Success>
  resetPassword?: Maybe<Success>
  signIn?: Maybe<AccessToken>
  signOut?: Maybe<Success>
  signUp?: Maybe<AccessToken>
  updateAvatar?: Maybe<Success>
  updateEmail?: Maybe<UpdateEmailResult>
  updatePassword?: Maybe<AccessToken>
  updateProfile?: Maybe<Profile>
  uploadImage?: Maybe<UploadedImage>
}

export type MutationConfirmVerificationArgs = {
  token: Scalars['String']['input']
}

export type MutationDeleteProfileArgs = {
  input: DeleteProfileInput
}

export type MutationNewPasswordArgs = {
  input: NewPasswordInput
  token: Scalars['String']['input']
}

export type MutationRequestVerificationArgs = {
  email: Scalars['String']['input']
}

export type MutationResetPasswordArgs = {
  email: Scalars['String']['input']
}

export type MutationSignInArgs = {
  input: CredentialsInput
}

export type MutationSignUpArgs = {
  input: CredentialsInput
}

export type MutationUpdateAvatarArgs = {
  imageId: Scalars['ID']['input']
}

export type MutationUpdateEmailArgs = {
  input: CredentialsInput
}

export type MutationUpdatePasswordArgs = {
  input: UpdatePasswordInput
}

export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput
}

export type MutationUploadImageArgs = {
  file: Scalars['File']['input']
}

export type NewPasswordInput = {
  password: Scalars['String']['input']
}

export type Profile = {
  __typename?: 'Profile'
  firstName: Scalars['String']['output']
  lastName: Scalars['String']['output']
}

export type Query = {
  __typename?: 'Query'
  emailTemplates?: Maybe<Array<EmailTemplate>>
  me?: Maybe<User>
}

export type Success = {
  __typename?: 'Success'
  messageKey: Scalars['String']['output']
}

export type UpdateEmailResult = {
  __typename?: 'UpdateEmailResult'
  accessToken?: Maybe<Scalars['String']['output']>
  email: Scalars['String']['output']
}

export type UpdatePasswordInput = {
  newPassword: Scalars['String']['input']
  oldPassword: Scalars['String']['input']
}

export type UpdateProfileInput = {
  firstName: Scalars['String']['input']
  lastName: Scalars['String']['input']
}

export type UploadedImage = {
  __typename?: 'UploadedImage'
  id: Scalars['ID']['output']
  image: Scalars['String']['output']
}

/** Public account fields. Credentials and internal version counters are never exposed. */
export type User = {
  __typename?: 'User'
  createdAt: Scalars['String']['output']
  email: Scalars['String']['output']
  firstName?: Maybe<Scalars['String']['output']>
  id: Scalars['ID']['output']
  image?: Maybe<Scalars['String']['output']>
  lastName?: Maybe<Scalars['String']['output']>
  updatedAt: Scalars['String']['output']
  verified: Scalars['Boolean']['output']
}

export type ResolverTypeWrapper<T> = Promise<T> | T

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>
}
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>
> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>

export type TypeResolveFn<
  TTypes,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>
> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>

export type IsTypeOfResolverFn<
  T = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>
> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>

export type NextResolverFn<T> = () => Promise<T>

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AccessToken: ResolverTypeWrapper<AccessToken>
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>
  CredentialsInput: CredentialsInput
  DeleteProfileInput: DeleteProfileInput
  EmailTemplate: ResolverTypeWrapper<EmailTemplate>
  File: ResolverTypeWrapper<Scalars['File']['output']>
  ID: ResolverTypeWrapper<Scalars['ID']['output']>
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>
  NewPasswordInput: NewPasswordInput
  Profile: ResolverTypeWrapper<Profile>
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>
  String: ResolverTypeWrapper<Scalars['String']['output']>
  Success: ResolverTypeWrapper<Success>
  UpdateEmailResult: ResolverTypeWrapper<UpdateEmailResult>
  UpdatePasswordInput: UpdatePasswordInput
  UpdateProfileInput: UpdateProfileInput
  UploadedImage: ResolverTypeWrapper<UploadedImage>
  User: ResolverTypeWrapper<User>
}

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AccessToken: AccessToken
  Boolean: Scalars['Boolean']['output']
  CredentialsInput: CredentialsInput
  DeleteProfileInput: DeleteProfileInput
  EmailTemplate: EmailTemplate
  File: Scalars['File']['output']
  ID: Scalars['ID']['output']
  Mutation: Record<PropertyKey, never>
  NewPasswordInput: NewPasswordInput
  Profile: Profile
  Query: Record<PropertyKey, never>
  String: Scalars['String']['output']
  Success: Success
  UpdateEmailResult: UpdateEmailResult
  UpdatePasswordInput: UpdatePasswordInput
  UpdateProfileInput: UpdateProfileInput
  UploadedImage: UploadedImage
  User: User
}

export type AccessTokenResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['AccessToken'] =
    ResolversParentTypes['AccessToken']
> = {
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}

export type EmailTemplateResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['EmailTemplate'] =
    ResolversParentTypes['EmailTemplate']
> = {
  defaultLanguage?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  languages?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>
}

export interface FileScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes['File'],
  any
> {
  name: 'File'
}

export type MutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Mutation'] =
    ResolversParentTypes['Mutation']
> = {
  confirmVerification?: Resolver<
    Maybe<ResolversTypes['AccessToken']>,
    ParentType,
    ContextType,
    RequireFields<MutationConfirmVerificationArgs, 'token'>
  >
  deleteProfile?: Resolver<
    Maybe<ResolversTypes['Success']>,
    ParentType,
    ContextType,
    RequireFields<MutationDeleteProfileArgs, 'input'>
  >
  newPassword?: Resolver<
    Maybe<ResolversTypes['AccessToken']>,
    ParentType,
    ContextType,
    RequireFields<MutationNewPasswordArgs, 'input' | 'token'>
  >
  requestVerification?: Resolver<
    Maybe<ResolversTypes['Success']>,
    ParentType,
    ContextType,
    RequireFields<MutationRequestVerificationArgs, 'email'>
  >
  resetPassword?: Resolver<
    Maybe<ResolversTypes['Success']>,
    ParentType,
    ContextType,
    RequireFields<MutationResetPasswordArgs, 'email'>
  >
  signIn?: Resolver<
    Maybe<ResolversTypes['AccessToken']>,
    ParentType,
    ContextType,
    RequireFields<MutationSignInArgs, 'input'>
  >
  signOut?: Resolver<Maybe<ResolversTypes['Success']>, ParentType, ContextType>
  signUp?: Resolver<
    Maybe<ResolversTypes['AccessToken']>,
    ParentType,
    ContextType,
    RequireFields<MutationSignUpArgs, 'input'>
  >
  updateAvatar?: Resolver<
    Maybe<ResolversTypes['Success']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAvatarArgs, 'imageId'>
  >
  updateEmail?: Resolver<
    Maybe<ResolversTypes['UpdateEmailResult']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdateEmailArgs, 'input'>
  >
  updatePassword?: Resolver<
    Maybe<ResolversTypes['AccessToken']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePasswordArgs, 'input'>
  >
  updateProfile?: Resolver<
    Maybe<ResolversTypes['Profile']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdateProfileArgs, 'input'>
  >
  uploadImage?: Resolver<
    Maybe<ResolversTypes['UploadedImage']>,
    ParentType,
    ContextType,
    RequireFields<MutationUploadImageArgs, 'file'>
  >
}

export type ProfileResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Profile'] =
    ResolversParentTypes['Profile']
> = {
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}

export type QueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Query'] =
    ResolversParentTypes['Query']
> = {
  emailTemplates?: Resolver<
    Maybe<Array<ResolversTypes['EmailTemplate']>>,
    ParentType,
    ContextType
  >
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>
}

export type SuccessResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['Success'] =
    ResolversParentTypes['Success']
> = {
  messageKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}

export type UpdateEmailResultResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['UpdateEmailResult'] =
    ResolversParentTypes['UpdateEmailResult']
> = {
  accessToken?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}

export type UploadedImageResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['UploadedImage'] =
    ResolversParentTypes['UploadedImage']
> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  image?: Resolver<ResolversTypes['String'], ParentType, ContextType>
}

export type UserResolvers<
  ContextType = GraphQLContext,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']
> = {
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>
  image?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>
}

export type Resolvers<ContextType = GraphQLContext> = {
  AccessToken?: AccessTokenResolvers<ContextType>
  EmailTemplate?: EmailTemplateResolvers<ContextType>
  File?: GraphQLScalarType
  Mutation?: MutationResolvers<ContextType>
  Profile?: ProfileResolvers<ContextType>
  Query?: QueryResolvers<ContextType>
  Success?: SuccessResolvers<ContextType>
  UpdateEmailResult?: UpdateEmailResultResolvers<ContextType>
  UploadedImage?: UploadedImageResolvers<ContextType>
  User?: UserResolvers<ContextType>
}
