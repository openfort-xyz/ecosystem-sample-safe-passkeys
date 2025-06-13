![Illustration_02](https://github.com/user-attachments/assets/7733bc34-9fa7-4e43-bde0-bbbf5518738c)

[banner-image]: [https://blog-cms.openfort.xyz/uploads/openfortjs_f52fdc3f2d.png](https://www.openfort.io/_next/image?url=https%3A%2F%2Fblog-cms.openfort.xyz%2Fuploads%2Frapidsafe_655a12bfdc.png&w=2048&q=75)

# RapidSafe Wallet

This is repository contains all code for RapidSafe Wallet. It's created with [`@openfort/ecosystem-js`](https://www.openfort.io/docs/guides/ecosystem).

<div align="center">
    <video width="100%" autoplay loop muted playsinline>
        <source src="https://blog-cms.openfort.xyz/uploads/rapidfire_demo_bae171c041.mp4" type="video/mp4">
        Your browser does not support the video tag.
    </video>
</div>

Visit the [live demo](https://rapidsafe.sample.openfort.xyz/).

## Features

- 🌱 Ecosystem Standards — Uses top libraries such as [wagmi](https://github.com/wagmi-dev/wagmi).
- 🖥️ Simple UX — Give users a simple, attractive experience.
- 🎨 Beautiful Themes — Predesigned themes or full customization.
- 🤝 Cross-platform support with [MWP](https://github.com/MobileWalletProtocol) for Unity, React Native and more.
- 🔑 Self-custodial out of the box.
- 🧠 [Safe](https://safe.global/core) smart account with session keys, transaction batching, sponsored transactions.

and much more...

## Project Structure

Every Ecosystem Wallet consists of two main projects: the **Wallet SDK** and the **Wallet UI**.

- `wallet-sdk`: Makes your wallet discoverable to developers installing it. Can be published to a package manager like [NPM](https://www.npmjs.com/) for easy integration.
- `wallet-ui`: The user interface for the wallet, including pages for sending transactions, signing messages, managing session keys, and more.


## Wallet SDK

This directory contains the core SDK for interacting with your ecosystem wallet, making it discoverable to developers.

For more details, see the [Wallet SDK README](./wallet-sdk/README.md).

## Wallet UI

The Ecosystem Wallet is a complete solution for managing digital assets within the ecosystem:

- `frontend`: Contains the user interface for the wallet, including pages for sending transactions, signing messages, managing session keys, and more.
- `backend`: Houses the server-side logic, currently focused on supporting non-custodial wallets.

For more information, refer to the [Wallet UI README](./wallet-ui/README.md).

## Usage Examples

This directory contains the usage examples of how developers wil be able to your your wallet in their projects.

For more details, see the [Usage Examples README](./usage-examples/README.md).
