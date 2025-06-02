import { Transport, Chain, http, toBytes, toHex } from 'viem';
import { toAccount } from 'viem/accounts';
import humanId from 'human-id';
import {
    createPaymasterClient,
    entryPoint07Address,
    getUserOperationHash,
    P256Credential,
} from 'viem/account-abstraction';
import { readContract } from 'viem/actions';
import { GrantPermissionsParameters, GrantPermissionsReturnType } from 'viem/experimental';

import * as PublicKey from 'ox/PublicKey'
import * as WebAuthnP256 from 'ox/WebAuthnP256'
import * as Address from 'ox/Address'
import * as Hex from 'ox/Hex'
import * as Bytes from 'ox/Bytes'
import * as PersonalMessage from 'ox/PersonalMessage'
import * as TypedData from 'ox/TypedData'
import * as Json from 'ox/Json'

import { toSafeSmartAccount, ToSafeSmartAccountReturnType } from 'permissionless/accounts';
import { createSmartAccountClient, SmartAccountClient } from 'permissionless';
import { getAccountNonce } from 'permissionless/actions';
import { erc7579Actions, Erc7579Actions } from 'permissionless/actions/erc7579';

import {
    encodeValidatorNonce,
    getAccount,
    getWebAuthnValidator,
    getWebauthnValidatorSignature,
    WEBAUTHN_VALIDATOR_ADDRESS,
    RHINESTONE_ATTESTER_ADDRESS,
    getWebauthnValidatorMockSignature,
    GLOBAL_CONSTANTS,
    OWNABLE_VALIDATOR_ADDRESS,
    encodeValidationData,
    Session,
    getSmartSessionsValidator,
    getEnableSessionsAction,
    getPermissions,
    getPermissionId,
} from '@rhinestone/module-sdk';

import * as Key from './internal/key';
import { AddressRegistry, WebAuthnValidator } from './internal/abi';
import { Client } from './EIP1193';
import { baseSepolia } from 'viem/chains';


// Storage keys for consistent access
const STORAGE_KEYS = {
    CREDENTIAL: (address: string) => `webauthn_credential_${address}`
};

type Call = {
    to: Address.Address;
    value?: bigint;
    data?: Hex.Hex;
};


type ERC7715Permissions = {
    type: string
    data: any
}

export class Implementation {
    private client: Client;
    public address: Address.Address;
    private credential: P256Credential | null;
    private smartAccountClient: SmartAccountClient<Transport, Chain, ToSafeSmartAccountReturnType<"0.7">> & Erc7579Actions<ToSafeSmartAccountReturnType<"0.7">> | null;
    private paymasterClient: ReturnType<typeof createPaymasterClient>;
    private bundlerUrl: string;

    constructor(client: Client, address: Address.Address) {
        this.client = client;
        this.address = address;
        this.credential = null;
        this.smartAccountClient = null;

        const chainId = this.client.chain?.id;
        if (!chainId) {
            throw new Error('Client must have a chain configured');
        }
        // 'https://api.candide.dev/paymaster/v3/amoy/27a95ad5b1c461c2d8dbf020a74878fa'
        this.paymasterClient = createPaymasterClient({
            transport: http(`https://api.pimlico.io/v2/${chainId}/rpc${process.env.REACT_APP_PIMLICO_API_KEY ? `?apikey=${process.env.REACT_APP_PIMLICO_API_KEY}` : ''}`),
        });
        // 'https://api.candide.dev/bundler/v3/amoy/27a95ad5b1c461c2d8dbf020a74878fa'
        this.bundlerUrl = `https://api.pimlico.io/v2/${chainId}/rpc${process.env.REACT_APP_PIMLICO_API_KEY ? `?apikey=${process.env.REACT_APP_PIMLICO_API_KEY}` : ''}`;
        console.log(`[Implementation] Initializing with address: ${address} on chain ID: ${chainId}`);

        this.loadCredentialFromStorage();
    }

    /**
     * Load credentials from localStorage
     */
    private loadCredentialFromStorage(): void {
        try {
            const credentialJson = localStorage.getItem(STORAGE_KEYS.CREDENTIAL(this.address));
            if (credentialJson) {
                const parsedCredential = JSON.parse(credentialJson);
                this.credential = {
                    id: parsedCredential.id,
                    raw: parsedCredential.raw,
                    publicKey: parsedCredential.publicKey,
                };
                console.log(`[Implementation] Loaded credential from storage for ${this.address}`);
            }
        } catch (error) {
            console.error(`[Implementation] Error loading credential from storage:`, error);
        }
    }

    /**
     * Save credential to localStorage
     */
    private saveCredentialToStorage(): void {
        if (this.credential) {
            try {
                localStorage.setItem(
                    STORAGE_KEYS.CREDENTIAL(this.address),
                    JSON.stringify({
                        id: this.credential.id,
                        raw: this.credential.raw,
                        publicKey: this.credential.publicKey,
                    })
                );
                console.log(`[Implementation] Saved credential to storage for ${this.address}`);
            } catch (error) {
                console.error(`[Implementation] Error saving credential to storage:`, error);
            }
        }
    }

    /**
     * Initialize the smartAccountClient based on the current credential
     */
    private async initializeSmartAccountClient(paymasterUrl?: string): Promise<void> {
        if (!this.credential) {
            throw new Error('Cannot initialize smart account client: Credential is missing');
        }

        // If client is already initialized, no need to do it again
        if (this.smartAccountClient) {
            console.log(`[Implementation] Smart account client already initialized for ${this.address}`);
            return;
        }

        const { x, y, prefix } = PublicKey.from(this.credential.publicKey);
        const webauthnValidator = getWebAuthnValidator({
            pubKey: { x, y, prefix },
            authenticatorId: this.credential.id,
        });
        const smartSessions = getSmartSessionsValidator({})

        // Generate a temporary private key for the account
        // This is only used for initialization and will not be stored
        const deadOwner = toAccount({
            address: "0x000000000000000000000000000000000000dead",
            async signMessage() {
                return "0x";
            },
            async signTransaction() {
                return "0x";
            },
            async signTypedData() {
                return "0x";
            },
        });

        try {
            const safeAccount = await toSafeSmartAccount({
                client: this.client as any,
                address: this.address,
                version: "1.4.1",
                owners: [deadOwner],
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7",
                },
                safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
                erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                attesters: [RHINESTONE_ATTESTER_ADDRESS],
                attestersThreshold: 1,
                validators: [
                    {
                        address: webauthnValidator.address,
                        context: webauthnValidator.initData,
                    },
                    {
                        address: smartSessions.address,
                        context: smartSessions.initData,
                    }
                ],
            });

            const paymasterClient = paymasterUrl ? createPaymasterClient({
                transport: http(paymasterUrl),
            }) : this.paymasterClient;
            this.smartAccountClient = createSmartAccountClient({
                account: safeAccount,
                paymaster: paymasterClient,
                chain: this.client.chain,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        const response = await fetch(`${this.bundlerUrl}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                jsonrpc: "2.0",
                                method: "pimlico_getUserOperationGasPrice",
                                params: [],
                                id: 1
                            })
                        });

                        const data = await response.json();
                        if (data.error) {
                            throw new Error(`Failed to get gas price: ${data.error.message}`);
                        }

                        return {
                            maxFeePerGas: BigInt(data.result.fast.maxFeePerGas || 0),
                            maxPriorityFeePerGas: BigInt(data.result.fast.maxPriorityFeePerGas || 0),
                        };
                    },
                },
                bundlerTransport: http(this.bundlerUrl),
            }).extend(erc7579Actions()) as any;

            // here ensure modules are installed
            // await this.client.getCode({ address: this.address })
            // const isSmartSessionValidatorInstalled = await this.smartAccountClient!.isModuleInstalled(
            //     getSmartSessionsValidator({}),
            // );
            // const isWebAuthnValidatorInstalled = await this.smartAccountClient!.isModuleInstalled(
            //     webauthnValidator,
            // );

            console.log(`[Implementation] Smart account client initialized for ${this.address}`);
            console.log(`[Implementation] Smart account client address: ${this.smartAccountClient?.account.address}`);
        } catch (error) {
            console.error(`[Implementation] Error initializing smart account client:`, error);
            throw new Error(`Failed to initialize smart account: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Creates a new account with WebAuthn
     */
    static async create(parameters: {
        client: Client,
        label?: string | undefined,
    }): Promise<Implementation> {
        const { client } = parameters;

        // Ensure the client has a chain
        if (!client.chain) {
            throw new Error('Client must have a chain configured');
        }

        console.log(`[Implementation] Creating new account on chain: ${client.chain.name}`);

        try {
            const deadOwner = toAccount({
                address: "0x000000000000000000000000000000000000dead",
                async signMessage() {
                    return "0x";
                },
                async signTransaction() {
                    return "0x";
                },
                async signTypedData() {
                    return "0x";
                },
            });

            const id = () => humanId({ capitalize: true, separator: ' ' })
            const label = parameters.label ?? id();
            const hexLabel = toHex(
                toBytes(label, { size: 32 })
            );

            const credential = await Key.createWebAuthnP256({
                label,
                role: 'admin',
                rpId: undefined,
                userId: Bytes.from(hexLabel),
            });
            const { x, y, prefix } = PublicKey.from(credential.publicKey);
            const webauthnValidator = getWebAuthnValidator({
                pubKey: { x, y, prefix },
                authenticatorId: credential.credential.id,
            });
            const smartSessions = getSmartSessionsValidator({})
            const safeAccount = await toSafeSmartAccount({
                client: client as any,
                version: "1.4.1",
                owners: [deadOwner],
                entryPoint: {
                    address: entryPoint07Address,
                    version: "0.7",
                },
                safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
                erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
                attesters: [RHINESTONE_ATTESTER_ADDRESS],
                attestersThreshold: 1,
                validators: [
                    {
                        address: webauthnValidator.address,
                        context: webauthnValidator.initData,
                    },
                    {
                        address: smartSessions.address,
                        context: smartSessions.initData,
                    }
                ],
            });


            const impl = new Implementation(client, safeAccount.address);
            const smartAccountClient = createSmartAccountClient({
                account: safeAccount,
                paymaster: impl.paymasterClient,
                chain: client.chain!,
                userOperation: {
                    estimateFeesPerGas: async () => {
                        const response = await fetch(`${impl.bundlerUrl}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                jsonrpc: "2.0",
                                method: "pimlico_getUserOperationGasPrice",
                                params: [],
                                id: 1
                            })
                        });

                        const data = await response.json();
                        if (data.error) {
                            throw new Error(`Failed to get gas price: ${data.error.message}`);
                        }

                        return {
                            maxFeePerGas: BigInt(data.result.fast.maxFeePerGas || 0),
                            maxPriorityFeePerGas: BigInt(data.result.fast.maxPriorityFeePerGas || 0),
                        };
                    },
                },
                bundlerTransport: http(impl.bundlerUrl),
            }).extend(erc7579Actions());
            const url = `${process.env.REACT_APP_BACKEND_URL}/api/register-user`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: hexLabel,
                    address: safeAccount.address
                }),
            });
            console.log(`[Implementation] Response from backend:`, response);
            if (response.status !== 201) {
                throw new Error(`Failed to register user: ${response.statusText}`);
            }

            // Set the credential on the implementation
            impl.credential = {
                id: credential.credential.id,
                raw: credential.credential.raw,
                publicKey: credential.publicKey,
            };

            impl.smartAccountClient = smartAccountClient as any;

            // Save credential to localStorage
            impl.saveCredentialToStorage();

            return impl;
        } catch (error) {
            console.error(`[Implementation] Error creating account:`, error);
            throw new Error(`Failed to create account: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Loads an existing account using WebAuthn authentication
     */
    static async load(parameters: {
        getClient: (chainId_?: Hex.Hex | number | undefined) => Client,
        rpId?: string,
    }): Promise<Implementation | null> {
        const { getClient, rpId } = parameters;
        const client = getClient();

        // Ensure the client has a chain
        if (!client.chain) {
            throw new Error('Client must have a chain configured');
        }

        console.log(`[Implementation] Loading account with rpId: ${rpId} on chain: ${client.chain.name}`);

        try {
            // Discovery step - sign a random challenge to get user credentials
            const { userId, credentialId, raw } = await (async () => {
                const credential = await WebAuthnP256.sign({
                    challenge: '0x',
                    rpId: rpId,
                });

                const response = credential.raw.response as AuthenticatorAssertionResponse;
                console.log(`[Implementation] WebAuthn response:`, response);
                const userId = Bytes.toHex(new Uint8Array(response.userHandle!));
                const credentialId = credential.raw.id;

                return { userId, credentialId, raw: credential.raw };
            })();
            console.log(`[Implementation] User ID: ${userId}, Credential ID: ${credentialId}`);
            const baseSepoliaRegistry = getClient(baseSepolia.id);
            const address = await readContract(baseSepoliaRegistry, {
                address: "0x8DF5FAe7543FEc5B0E46A13dA1329298C2c0f86C",
                abi: AddressRegistry,
                functionName: 'getAddress',
                args: [userId],
            })

            // Read the public key from the contract
            const key = await readContract(client, {
                address: GLOBAL_CONSTANTS.WEBAUTHN_VALIDATOR_ADDRESS,
                abi: WebAuthnValidator,
                functionName: 'webAuthnValidatorStorage',
                args: [address],
            });
            const publicKey = PublicKey.from({ x: key[0], y: key[1] });
            const publicKeyHex = PublicKey.toHex(publicKey);
            const p256Credential: P256Credential = {
                id: credentialId,
                raw: raw,
                publicKey: publicKeyHex,
            };
            console.log(`[Implementation] Loaded account with address: ${address} on chain ID: ${client.chain?.id}`);
            // Create implementation with the extracted address and transport options
            const impl = new Implementation(client, address);
            impl.credential = p256Credential;
            // Save credential to storage
            impl.saveCredentialToStorage();

            // Initialize the smart account client
            await impl.initializeSmartAccountClient();

            return impl;
        } catch (error) {
            console.error('[Implementation] Error loading account:', error);
            return null;
        }
    }

    /**
     * Ensures a smart account client is available and returns it
     * @returns Promise<SmartAccountClient> that resolves with the initialized client
     */
    async ensureSmartAccountClient(paymasterUrl?: string): Promise<SmartAccountClient<Transport, Chain, ToSafeSmartAccountReturnType<"0.7">> & Erc7579Actions<ToSafeSmartAccountReturnType<"0.7">>> {
        if (!this.credential) {
            throw new Error('Cannot initialize smart account client: No credential available');
        }

        if (!this.smartAccountClient) {
            await this.initializeSmartAccountClient(paymasterUrl);
        }

        if (!this.smartAccountClient) {
            throw new Error('Failed to initialize smart account client');
        }

        return this.smartAccountClient;
    }

    /**
     * Execute transaction calls
     */
    async execute(calls: Call[], paymasterUrl?: string): Promise<string> {
        try {
            // Ensure smartAccountClient is initialized and get the reference
            const smartAccountClient = await this.ensureSmartAccountClient(paymasterUrl);
            // smartAccountClient.account.isDeployed = async () => true;
            smartAccountClient.account.address = this.address;
            // Get the current nonce
            const nonce = await getAccountNonce(this.client, {
                address: this.address,
                entryPointAddress: entryPoint07Address,
                key: encodeValidatorNonce({
                    account: getAccount({
                        address: this.address,
                        type: "safe",
                    }),
                    validator: WEBAUTHN_VALIDATOR_ADDRESS,
                }),
            });
            console.log(`[Implementation] Nonce: ${nonce}`);
            // Prepare the user operation
            const userOperation = await smartAccountClient.prepareUserOperation({
                account: smartAccountClient.account,
                calls,
                nonce,
                signature: getWebauthnValidatorMockSignature(),
            });
            console.log(`[Implementation] User operation prepared:`, userOperation);

            // Get the chain from the client
            const chain = this.client.chain;
            if (!chain) {
                throw new Error('Client must have a chain configured');
            }

            // Get the hash to sign using the client's chain ID
            const userOpHashToSign = getUserOperationHash({
                chainId: chain.id,
                entryPointAddress: entryPoint07Address,
                entryPointVersion: "0.7",
                userOperation,
            });

            // Sign the user operation with WebAuthn
            const { metadata: webauthn, signature } = await WebAuthnP256.sign({
                credentialId: this.getCredentialId(),
                challenge: userOpHashToSign,
            });

            // Encode the signature for the validator
            const encodedSignature = getWebauthnValidatorSignature({
                webauthn,
                signature,
                usePrecompiled: false,
            });

            userOperation.signature = encodedSignature;

            // Send the user operation
            const userOpHash = await smartAccountClient.sendUserOperation(userOperation);
            console.log(`[Implementation] User operation sent with hash: ${userOpHash}`);

            // Wait for the receipt
            const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });
            console.log(`[Implementation] User operation receipt received:`, receipt);

            return receipt.receipt.transactionHash;
        } catch (error) {
            console.error(`[Implementation] Error executing transaction:`, error);
            throw new Error(`Transaction execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }


    async estimateGas(calls: Call[]): Promise<bigint> {
        try {
            const smartAccountClient = await this.ensureSmartAccountClient();
            smartAccountClient.account.address = this.address;
            const account = getAccount({
                address: this.address,
                type: 'safe',
            })
            const nonce = await getAccountNonce(this.client, {
                address: this.address,
                entryPointAddress: entryPoint07Address,
                key: encodeValidatorNonce({
                    account: account,
                    validator: WEBAUTHN_VALIDATOR_ADDRESS,
                }),
            });
            const unsignedUserOp = await smartAccountClient.estimateUserOperationGas({
                account: smartAccountClient.account,
                calls: calls,
                nonce,
                signature: getWebauthnValidatorMockSignature(),
            });
            const userOperationMaxGas =
                unsignedUserOp.preVerificationGas +
                unsignedUserOp.verificationGasLimit +
                unsignedUserOp.callGasLimit +
                (unsignedUserOp.paymasterVerificationGasLimit || BigInt(0)) +
                (unsignedUserOp.paymasterPostOpGasLimit || BigInt(0));
            return userOperationMaxGas
        } catch (error) {
            console.error(`[Implementation] Error estimating gas:`, error);
            throw new Error(`Gas estimation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sign a personal message
     */
    async grantPermissions(data: GrantPermissionsParameters[]): Promise<GrantPermissionsReturnType> {
        try {
            // Ensure smartAccountClient is initialized and get the reference
            const smartAccountClient = await this.ensureSmartAccountClient();
            smartAccountClient.account.address = this.address;
            const param = data[0];
            // Get the current nonce
            const chain = this.client.chain;
            if (!chain) {
                throw new Error('Client must have a chain configured');
            }
            let sessionValidatorAddress: Address.Address;
            let sessionValidatorInitData: Hex.Hex;

            if (param.signer) {
                // Logic based on signer type
                switch (param.signer.type) {
                    case 'account':
                        // Option 1: Use Ownable validator with the signer account as owner
                        sessionValidatorAddress = OWNABLE_VALIDATOR_ADDRESS;
                        sessionValidatorInitData = encodeValidationData({
                            owners: [param.signer.data.id],
                            threshold: 1,
                        });
                        break;
                    case 'wallet':
                        throw new Error('Wallet signer type is not supported yet');
                    default:
                        throw new Error(`Unsupported signer type: ${param.signer.type}`);
                }
            } else {
                // Option: Throw an error if signer/account info is required
                throw new Error('Signer or account must be provided for session validation');
            }

            // --- 2. Use getPermissions to get policies and actions ---
            const { userOpPolicies, erc7739Policies, actions } = getPermissions({
                permissions: param.permissions as unknown as ERC7715Permissions[], // Use the aggregated permissions
            });


            const session: Session = {
                sessionValidator: OWNABLE_VALIDATOR_ADDRESS, // Or determine dynamically if needed
                sessionValidatorInitData: sessionValidatorInitData,
                salt: toHex(toBytes(Date.now().toString(), { size: 32 })),
                userOpPolicies, // Policies derived from permissions
                erc7739Policies, // Policies derived from permissions
                actions, // Actions derived from permissions
                chainId: BigInt(chain.id),
                permitERC4337Paymaster: true, // Or determine based on input/config
            };

            const account = getAccount({
                address: this.address,
                type: 'safe',
            })
            const call = await getEnableSessionsAction({
                sessions: [session],
            });
            console.log(`[Implementation] Granting permissions with call:`, call);
            const nonce = await getAccountNonce(this.client, {
                address: this.address,
                entryPointAddress: entryPoint07Address,
                key: encodeValidatorNonce({
                    account: account,
                    validator: WEBAUTHN_VALIDATOR_ADDRESS,
                }),
            });
            const userOperation = await smartAccountClient.prepareUserOperation({
                account: smartAccountClient.account,
                calls: [call],
                nonce,
                signature: getWebauthnValidatorMockSignature(),
            });
            // Get the hash to sign using the client's chain ID
            const userOpHashToSign = getUserOperationHash({
                chainId: chain.id,
                entryPointAddress: entryPoint07Address,
                entryPointVersion: "0.7",
                userOperation,
            });

            // Sign the user operation with WebAuthn
            const { metadata: webauthn, signature } = await WebAuthnP256.sign({
                credentialId: this.getCredentialId(),
                challenge: userOpHashToSign,
            });

            const encodedSignature = getWebauthnValidatorSignature({
                webauthn,
                signature,
                usePrecompiled: false,
            });

            userOperation.signature = encodedSignature;

            // Send the user operation
            const userOpHash = await smartAccountClient.sendUserOperation(userOperation);
            console.log(`[Implementation] User operation sent with hash: ${userOpHash}`);

            const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });
            console.log(`[Implementation] User operation receipt received:`, receipt);
            const permissionId = getPermissionId({ session }); // Calculate ID based on final session
            return {
                permissionsContext: permissionId,
                grantedPermissions: param.permissions,
                expiry: 0,
            };
        } catch (error) {
            console.error(`[Implementation] Error executing transaction:`, error);
            throw new Error(`Transaction execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sign a personal message
     */
    async signPersonalMessage(data: `0x${string}`): Promise<string> {
        const { metadata: webauthn, signature } = await WebAuthnP256.sign({
            credentialId: this.getCredentialId(),
            challenge: PersonalMessage.getSignPayload(data),
        });
        const encodedSignature = getWebauthnValidatorSignature({
            webauthn,
            signature,
            usePrecompiled: false,
        });
        return encodedSignature;
    }

    /**
     * Sign typed data (EIP-712)
     */
    async signTypedData(data: any): Promise<string> {
        console.log(`[Implementation] Signing typed message: ${data}`, this.credential);
        const { metadata: webauthn, signature } = await WebAuthnP256.sign({
            credentialId: this.getCredentialId(),
            challenge: TypedData.getSignPayload(Json.parse(data)),
        });
        const encodedSignature = getWebauthnValidatorSignature({
            webauthn,
            signature,
            usePrecompiled: false,
        });
        return encodedSignature;
    }

    /**
     * Get the credential ID
     */
    getCredentialId(): string | undefined {
        return this.credential?.id;
    }
}