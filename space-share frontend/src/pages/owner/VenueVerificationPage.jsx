import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';

const VenueVerificationPage = () => {
  const { id: venueId } = useParams();

  const [venue, setVenue] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form files & notes
  const [documentType, setDocumentType] = useState('government_id');
  const [idProofFile, setIdProofFile] = useState(null);
  const [addressProofFile, setAddressProofFile] = useState(null);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get venue
      const venueRes = await api.get(`/venues/${venueId}`);
      setVenue(venueRes.data?.data?.venue || venueRes.data?.data);

      // 2. Get verification status
      const verifRes = await api.get(`/verifications/venue/${venueId}`);
      setVerifications(verifRes.data?.data?.verifications || []);
    } catch (err) {
      console.error('Failed to load verification status:', err);
      setError('Failed to fetch verification status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [venueId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!idProofFile && !addressProofFile) {
      setError('Please attach at least one proof document (ID or Address proof).');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('venue_id', venueId);
      form.append('document_type', documentType);
      form.append('notes', notes);
      if (idProofFile) form.append('id_proof', idProofFile);
      if (addressProofFile) form.append('address_proof', addressProofFile);

      await api.post('/verifications/submit', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg('Verification documents submitted successfully for admin review!');
      setIdProofFile(null);
      setAddressProofFile(null);
      setNotes('');
      await fetchData();
    } catch (err) {
      console.error('Verification submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit documents.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-8 bg-surface-container-high rounded w-1/3" />
        <div className="h-64 bg-surface-container-high rounded-2xl" />
      </div>
    );
  }

  const latestVerification = verifications[0];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Back breadcrumb */}
      <Link
        to="/owner/dashboard"
        className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-on-surface mb-4"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Host Dashboard
      </Link>

      <div className="bg-surface-container-lowest p-6 sm:p-10 rounded-3xl border border-outline-variant/30 shadow-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-6 mb-6">
          <div>
            <h1 className="font-headline font-bold text-2xl text-on-surface">
              Host Property Verification
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Venue: <span className="font-bold text-on-surface">{venue?.title || venue?.name}</span>
            </p>
          </div>
          <StatusBadge
            type="verification"
            status={venue?.is_verified ? 'verified' : latestVerification?.status || 'unverified'}
          />
        </div>

        {/* Informational Banner */}
        <div className="p-4 rounded-2xl bg-secondary-container/50 border border-outline-variant/30 text-xs text-on-surface-variant leading-relaxed mb-6 space-y-1">
          <p className="font-bold text-on-surface">Why is verification mandatory?</p>
          <p>
            SpaceShare guarantees 100% verified celebration spaces. Submitting your government ID proof and property ownership/address document ensures your venue appears prominently in public search results and unlocks instant booking reservations.
          </p>
        </div>

        {/* Existing Status Card */}
        {latestVerification && (
          <div className="mb-8 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-on-surface">Latest Submission Status:</span>
              <StatusBadge type="verification" status={latestVerification.status} />
            </div>
            <p className="text-on-surface-variant">
              Submitted on: {new Date(latestVerification.submitted_at || latestVerification.created_at).toLocaleString()}
            </p>
            {latestVerification.rejection_reason && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error font-medium">
                Admin Rejection Note: {latestVerification.rejection_reason}
              </div>
            )}
            {latestVerification.admin_notes && (
              <p className="text-on-surface-variant italic">Note: {latestVerification.admin_notes}</p>
            )}
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-tertiary-container/15 border border-tertiary/20 text-tertiary text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Verification Upload Form */}
        {!venue?.is_verified && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Document Classification
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="government_id">Aadhaar Card / PAN / Passport</option>
                <option value="property_tax_receipt">Property Tax Receipt</option>
                <option value="electricity_bill">Electricity Utility Bill</option>
                <option value="lease_agreement">Commercial Lease / Ownership Deed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  1. Identity Proof (ID) *
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setIdProofFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-container cursor-pointer bg-surface-container-low p-2 rounded-xl border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  2. Property Address Proof
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setAddressProofFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-container cursor-pointer bg-surface-container-low p-2 rounded-xl border border-outline-variant/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Additional Notes for Admin Team
              </label>
              <textarea
                rows={3}
                placeholder="Any special remarks or details about property ownership..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Documents...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VenueVerificationPage;
