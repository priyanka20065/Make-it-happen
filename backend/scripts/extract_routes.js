const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '../src/index.js');
const routesFile = path.join(__dirname, '../src/routes/api.js');

let code = fs.readFileSync(indexFile, 'utf8');

// The start is app.get("/api/health"
const startIndex = code.indexOf('app.get("/api/health"');

// The end is the start of: app.use((req, res, next) => {
const endIndex = code.indexOf('app.use((req, res, next) => {');

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end index");
    process.exit(1);
}

// Extract the routes block
const routesBlock = code.slice(startIndex, endIndex);

// It has some static serving routes at the end which we can discard
const staticRouteStart = routesBlock.indexOf('app.get("/flat/:id"');
const cleanRoutesBlock = staticRouteStart !== -1 ? routesBlock.slice(0, staticRouteStart) : routesBlock;

const helpersList = [
    'imageUpload',
    'razorpayEnabled',
    'razorpay',
    'mailEnabled',
    'sendEmail',
    'crypto',
    'CAMPUS',
    // Functions
    'sanitizeUser', 'makeId', 'toNumber', 'normalizeSubscriptionPlan',
    'getSubscriptionDurationDays', 'getSubscriptionExpiry', 'getSubscriptionLockState',
    'activateSubscription', 'toOptionalCoordinatePair', 'normalizeCoordinatePair',
    'normalizeTourUrl', 'normalizeTourUrls', 'normalizeImageUrls', 'stripMongoId',
    'normalizeFlat', 'normalizeRoommate', 'normalizeFlatMetrics', 'haversineDistanceKm',
    'getFlatMetrics', 'getUniqueUserMessageCount', 'getOwnerFlatStats',
    'getPurchasedFlatIdByUser', 'getRoommateJoinedUserIds', 'hasUserBookedAnyRoommate',
    'isEligibleStudentBuyer', 'hasAnyRoomBookedByUser', 'hasRoommateSeatAvailable',
    'getUserActivityCounts', 'enrichFlat', 'enrichRoommate', 'isAppGeneratedListingId',
    'isActiveOwnerListing', 'isActiveRoommateListing', 'pruneUnsupportedListingsFromState',
    'profileToScore', 'pushSseEvent', 'broadcastBrowseUpdate', 'broadcastChatUpdate',
    'persistUser', 'persistFlat', 'deleteFlat', 'deleteChat', 'persistRoommate',
    'persistChatMessages', 'persistFlatMetrics', 'deleteFlatMetrics',
    'browseSubscribers', 'chatSubscribers'
];

const routesContent = `
module.exports = function(app, ctx) {
  const {
    state,
    dbCollections,
    FREE_CHAT_LIMIT,
    ${helpersList.join(',\n    ')}
  } = ctx;

${cleanRoutesBlock}
};
`;

fs.writeFileSync(routesFile, routesContent, 'utf8');

// Now replace in index.js
const prefix = code.slice(0, startIndex);
const suffix = code.slice(endIndex);

const injected =
    `require('./routes/api')(app, {
  state,
  dbCollections,
  FREE_CHAT_LIMIT,
  ${helpersList.join(',\n  ')}
});\n\n`;

fs.writeFileSync(indexFile, prefix + injected + suffix, 'utf8');

console.log("Extraction complete!");
