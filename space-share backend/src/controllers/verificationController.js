const { supabaseAdmin } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * 1. Owner submits ID/Address proof for a venue
 * Table: venue_verifications
 */
const submitVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { venue_id, document_type, notes } = req.body;

    if (!venue_id) {
      return errorResponse(res, 'venue_id is required', 400);
    }

    // Verify venue ownership
    const { data: venue, error: venueError } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id')
      .eq('id', venue_id)
      .maybeSingle();

    if (venueError || !venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    let idProofUrl = req.body.id_proof_url;
    let addressProofUrl = req.body.address_proof_url;

    // Support file uploads if multi-part files attached
    if (req.files) {
      if (req.files.id_proof && req.files.id_proof[0]) {
        const file = req.files.id_proof[0];
        const ext = file.originalname.split('.').pop();
        const fileName = `verifications/${venue_id}/id_proof_${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('venue_verifications')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage
            .from('venue_verifications')
            .getPublicUrl(fileName);
          idProofUrl = urlData?.publicUrl;
        }
      }

      if (req.files.address_proof && req.files.address_proof[0]) {
        const file = req.files.address_proof[0];
        const ext = file.originalname.split('.').pop();
        const fileName = `verifications/${venue_id}/address_proof_${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('venue_verifications')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage
            .from('venue_verifications')
            .getPublicUrl(fileName);
          addressProofUrl = urlData?.publicUrl;
        }
      }
    }

    if (!idProofUrl && !addressProofUrl) {
      return errorResponse(res, 'At least one proof document (ID or Address proof) is required', 400);
    }

    const verificationPayload = {
      venue_id,
      owner_id: userId,
      document_type: document_type || 'government_id',
      id_proof_url: idProofUrl || null,
      address_proof_url: addressProofUrl || null,
      notes: notes || '',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };

    const { data: verification, error: insertError } = await supabaseAdmin
      .from('venue_verifications')
      .insert(verificationPayload)
      .select()
      .single();

    if (insertError) {
      return errorResponse(res, 'Failed to submit verification request', 500, insertError.message);
    }

    return successResponse(
      res,
      { verification },
      'Verification documents submitted successfully for admin review',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Admin: Get all verification requests (optionally filtered by status)
 */
const getVerifications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('venue_verifications')
      .select('*, venues(*), profiles:owner_id(id, full_name, email, phone)', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    const { data: verifications, count, error } = await query;

    if (error) {
      return errorResponse(res, 'Failed to fetch verifications', 500, error.message);
    }

    return successResponse(
      res,
      {
        verifications: verifications || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
      },
      'Verifications fetched successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Admin: Review verification request (approve or reject)
 * Sets venues.is_verified to true (if approved) or false (if rejected)
 */
const reviewVerification = async (req, res, next) => {
  try {
    const { id } = req.params; // verification id
    const { action, rejection_reason, admin_notes } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return errorResponse(res, 'Action must be either "approve" or "reject"', 400);
    }

    // Fetch existing verification record
    const { data: verification, error: fetchErr } = await supabaseAdmin
      .from('venue_verifications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !verification) {
      return errorResponse(res, 'Verification record not found', 404);
    }

    const isApproved = action === 'approve';
    const newStatus = isApproved ? 'approved' : 'rejected';

    // 1. Update verification record
    const { data: updatedVerification, error: updateErr } = await supabaseAdmin
      .from('venue_verifications')
      .update({
        status: newStatus,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: isApproved ? null : (rejection_reason || 'Does not meet requirements'),
        admin_notes: admin_notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return errorResponse(res, 'Failed to update verification status', 500, updateErr.message);
    }

    // 2. Update venue's is_verified status
    const { error: venueUpdateErr } = await supabaseAdmin
      .from('venues')
      .update({
        is_verified: isApproved,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.venue_id);

    if (venueUpdateErr) {
      return errorResponse(res, 'Verification updated, but failed to update venue is_verified flag', 500, venueUpdateErr.message);
    }

    return successResponse(
      res,
      { verification: updatedVerification, is_verified: isApproved },
      `Verification ${isApproved ? 'approved' : 'rejected'} successfully`
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Venue owner check verification status for their venue
 */
const getVenueVerificationStatus = async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('id, owner_id, is_verified')
      .eq('id', venueId)
      .maybeSingle();

    if (!venue) {
      return errorResponse(res, 'Venue not found', 404);
    }

    if (venue.owner_id !== userId && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not own this venue', 403);
    }

    const { data: verifications, error } = await supabaseAdmin
      .from('venue_verifications')
      .select('*')
      .eq('venue_id', venueId)
      .order('submitted_at', { ascending: false });

    if (error) {
      return errorResponse(res, 'Failed to fetch venue verification details', 500, error.message);
    }

    return successResponse(
      res,
      {
        is_verified: venue.is_verified,
        verifications: verifications || [],
      },
      'Venue verification status retrieved'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitVerification,
  getVerifications,
  reviewVerification,
  getVenueVerificationStatus,
};
