# Plan: eBay-Style Public Bidding System

This document outlines the blueprint for implementing a robust, real-time public bidding system for IIT Exchange.

## 1. Core Concepts
*   **Public Bidding**: All users can view the current high bid and bidding history.
*   **Bid Increments**: Enforce minimum steps between bids (e.g., ₹50 or 5%).
*   **Reserve Price**: Optional hidden price. If the final bid is lower, the seller isn't obligated to sell.
*   **Zero-Trust Validation**: All bids verified on the server for balance, timing, and increment logic.

## 2. Database Schema (Firebase)

### `/products/{productId}` (Updates)
```typescript
{
  type: 'auction', // or 'fixed'
  startingPrice: number,
  reservePrice: number,
  currentHighBid: number,
  highBidderId: string,
  auctionEndTime: Timestamp,
  bidCount: number,
  status: 'active' | 'sold' | 'expired'
}
```

### `/products/{productId}/bids/{bidId}`
```typescript
{
  bidderId: string,
  bidderName: string, // Anonymized if needed: "J*** S***"
  amount: number,
  timestamp: ServerTimestamp
}
```

## 3. Key Components to Build

### A. Real-time Auction Timer
*   A `CountdownTimer` component on the Product Detail page.
*   Logic to auto-disable bidding when `currentTime > auctionEndTime`.
*   **Anti-Snipe Protection**: If a bid is placed in the last 2 minutes, extend the auction by 2 minutes (prevents bot sniping).

### B. Bidding Interface
*   Input field with "Minimum Bid: ₹XXX" placeholder.
*   Quick-bid buttons (+₹100, +₹500).
*   Live status indicator: "You are the highest bidder" vs "You have been outbid".

### C. Backend API (Express)
*   `POST /api/listings/:id/bid`: 
    1. Verify `idToken`.
    2. Check if auction is still active.
    3. Verify bid > `currentHighBid + increment`.
    4. Transactionally update `currentHighBid` and create `Bid` record.

## 4. Implementation phases

### Phase 1: Skeleton (Today)
*   Update UI to show "Auction" type tag.
*   Add the bidding input fields.
*   Implement basic timer.

### Phase 2: Real-time Sync
*   Connect `onSnapshot` to the `bids` subcollection.
*   Trigger animations when the price changes.

### Phase 3: Notifications
*   Send email via Resend when a user is outbid.
*   Send email to seller when auction ends.

---

**Next Steps**: Should we start by updating the "Start Listing" form to allow selecting "Auction" vs "Fixed Price"?
