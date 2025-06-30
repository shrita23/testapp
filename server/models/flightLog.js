const mongoose = require('mongoose');

const flightLogSchema = new mongoose.Schema({
    tail_number: { type: String, required: true },
    direction: { type: String, required: true },
    status: { type: String, required: true },
    timestamp: { type: Date, required: true }
}, { collection: 'flight_log' }); // Ensure this matches your actual collection name

// Optimized indexes for better query performance
flightLogSchema.index({ timestamp: -1 });  // For recent-first queries
flightLogSchema.index({ tail_number: 1, timestamp: -1 });  // Filter + sort combo
flightLogSchema.index({ timestamp: 1, tail_number: 1, status: 1 });  // Aggregation support

module.exports = (connection) => {
    return connection.model('FlightLog', flightLogSchema);
};