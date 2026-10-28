import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

const AdminVerificationPage = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Review Modal / Prompt state
  const [reviewModal, setReviewModal] = useState({
    open: false,
    verification: null,
    action: 'approve',
    reason: '',
    notes: '',
  });

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/verifications');
      setVerifications(response.data?.data?.verifications || []);
    } catch (err) {
      console.error('Failed to load verification queue:', err);
      setError('Failed to fetch verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const openReviewModal = (verification, action) => {
    setReviewModal({
      open: true,
      verification,
      action,
      reason: action === 'reject' ? 'Document unreadable or invalid property proof' : '',
      notes: '',
    });
  };

  const submitReview = async () => {
    if (!reviewModal.verification) return;
    const { id } = reviewModal.verification;

    setActionLoadingId(id);
    try {
      await api.post(`/verifications/${id}/review`, {
        action: reviewModal.action,
        rejection_reason: reviewModal.action === 'reject' ? reviewModal.reason : null,
        admin_notes: reviewModal.notes || null,
      });

      setReviewModal({ open: false, verification: null, action: 'approve', reason: '', notes: '' });
      await fetchVerifications();
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredVerifications = verifications.filter((v) => {
    if (activeTab === 'pending') return v.status === 'pending';
    if (activeTab === 'approved') return v.status === 'approved';
    if (activeTab === 'rejected') return v.status === 'rejected';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
          <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
          Admin Control Center
        </div>
        <h1 className="font-headline font-bold text-2xl sm:text-3xl text-on-surface">
          Venue Verification Queue
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Review host identity documents, tax receipts, and property deeds to approve or reject celebration spaces
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 gap-6 mb-8 overflow-x-auto text-xs font-semibold">
        {['pending', 'approved', 'rejected', 'all'].map((tab) => {
          const count = verifications.filter((v) => (tab === 'all' ? true : v.status === tab)).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 capitalize transition-colors relative cursor-pointer ${
                activeTab === tab
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs mb-6">
          {error}
        </div>
      )}

      {/* Verifications Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-container-high rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredVerifications.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low border-b border-outline-variant/20 uppercase tracking-wider text-on-surface-variant font-semibold">
                <tr>
                  <th className="py-4 px-6">Venue & Owner</th>
                  <th className="py-4 px-6">Document Type</th>
                  <th className="py-4 px-6">Attached Proofs</th>
                  <th className="py-4 px-6">Submitted Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium">
                {filteredVerifications.map((item) => {
                  const venue = item.venues;
                  const owner = item.profiles;

                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low/50 transition">
                      {/* Venue & Owner */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-headline font-bold text-sm text-on-surface block">
                            {venue?.title || venue?.name || 'Unnamed Space'}
                          </span>
                          <span className="text-on-surface-variant text-[11px]">
                            Owner: {owner?.full_name || 'N/A'} ({owner?.email || 'N/A'})
                          </span>
                        </div>
                      </td>

                      {/* Document Type */}
                      <td className="py-4 px-6 capitalize text-on-surface">
                        {item.document_type ? item.document_type.replace(/_/g, ' ') : 'Government ID'}
                      </td>

                      {/* Documents Preview Links */}
                      <td className="py-4 px-6 space-y-1">
                        {item.id_proof_url ? (
                          <a
                            href={item.id_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-semibold block"
                          >
                            <span className="material-symbols-outlined text-[15px]">description</span>
                            View ID Proof
                          </a>
                        ) : (
                          <span className="text-on-surface-variant/60 text-[11px] block">No ID Proof</span>
                        )}

                        {item.address_proof_url ? (
                          <a
                            href={item.address_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-semibold block"
                          >
                            <span className="material-symbols-outlined text-[15px]">home</span>
                            View Address Proof
                          </a>
                        ) : (
                          <span className="text-on-surface-variant/60 text-[11px] block">No Address Proof</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4 px-6 text-on-surface-variant">
                        {new Date(item.submitted_at || item.created_at).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <StatusBadge type="verification" status={item.status} />
                      </td>

                      {/* Review Buttons */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {item.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => openReviewModal(item, 'approve')}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tertiary-container/20 text-tertiary hover:bg-tertiary-container/30 transition font-bold text-[11px] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(item, 'reject')}
                              disabled={actionLoadingId === item.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/15 text-error hover:bg-error/25 transition font-bold text-[11px] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-on-surface-variant/70 text-[11px]">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="verified"
          title={`No ${activeTab} verifications`}
          description="Verification submissions by hosts will appear here for administrative clearance."
        />
      )}

      {/* Review Dialog / Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-modal animate-in fade-in zoom-in-95">
            <h3 className="font-headline font-bold text-xl text-on-surface mb-2">
              {reviewModal.action === 'approve' ? 'Approve Venue Listing' : 'Reject Verification'}
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Venue:{' '}
              <span className="font-bold text-on-surface">
                {reviewModal.verification?.venues?.title || reviewModal.verification?.venues?.name}
              </span>
            </p>

            {reviewModal.action === 'reject' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Rejection Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reviewModal.reason}
                  onChange={(e) => setReviewModal({ ...reviewModal, reason: e.target.value })}
                  placeholder="Explain why the document was rejected..."
                  className="w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Internal Admin Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={reviewModal.notes}
                onChange={(e) => setReviewModal({ ...reviewModal, notes: e.target.value })}
                placeholder="Internal verification remarks..."
                className="w-full px-3 py-2 text-xs bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewModal({ open: false, verification: null, action: 'approve', reason: '', notes: '' })}
                className="px-4 py-2 rounded-xl border border-outline-variant/50 text-xs font-semibold text-on-surface hover:bg-surface-container transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={actionLoadingId !== null}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm ${
                  reviewModal.action === 'approve'
                    ? 'bg-tertiary hover:bg-tertiary-container'
                    : 'bg-error hover:bg-error/90'
                }`}
              >
                {reviewModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationPage;
