@extends('layouts.admin')

@section('title', 'Edit General Settings')

@section('contentheader', 'Edit Settings')

@section('contentheaderlink')
    <a href="{{ route('admin.adminPanelSetting.index') }}">Settings</a>
@endsection

@section('contentheaderactive', 'Edit')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="card card-primary card-outline">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h3 class="card-title">
                    <i class="fas fa-cogs"></i> Edit General Settings
                </h3>
                <a href="{{ route('admin.dashboard') }}" class="btn btn-sm btn-secondary">
                    <i class="fas fa-arrow-left"></i> Back to Dashboard
                </a>
            </div>

            <div class="card-body">
                @if(isset($data) && !empty($data))
                    <form action="{{ route('admin.adminPanelSetting.update') }}" method="POST" enctype="multipart/form-data">
                        @csrf
                        @method('PUT') <!-- Important for update -->

                        <!-- System Name -->
                        <div class="form-group mb-4">
                            <label for="system_name" class="font-weight-bold">
                                <i class="fas fa-building"></i> Company Title
                            </label>
                            <input type="text" name="system_name" id="system_name"
                                   class="form-control @error('system_name') is-invalid @enderror"
                                   value="{{ old('system_name', $data['system_name']) }}"
                                   placeholder="Enter company name" required>
                            @error('system_name')
                                <span class="invalid-feedback">{{ $message }}</span>
                            @enderror
                        </div>

                        <!-- Company Code -->
                        <div class="form-group mb-4">
                            <label for="com_code">
                                <i class="fas fa-barcode"></i> Company Code
                            </label>
                            <input type="text" name="com_code" id="com_code"
                                   class="form-control @error('com_code') is-invalid @enderror"
                                   value="{{ old('com_code', $data['com_code']) }}"
                                   placeholder="e.g., ACME2025" required>
                            @error('com_code')
                                <span class="invalid-feedback">{{ $message }}</span>
                            @enderror
                        </div>

                        <!-- Phone -->
                        <div class="form-group mb-4">
                            <label for="phone">
                                <i class="fas fa-phone"></i> Phone Number
                            </label>
                            <input type="text" name="phone" id="phone"
                                   class="form-control @error('phone') is-invalid @enderror"
                                   value="{{ old('phone', $data['phone']) }}"
                                   placeholder="+20 123 456 7890">
                            @error('phone')
                                <span class="invalid-feedback">{{ $message }}</span>
                            @enderror
                        </div>

                        <!-- Address -->
                        <div class="form-group mb-4">
                            <label for="address">
                                <i class="fas fa-map-marker-alt"></i> Address
                            </label>
                            <textarea name="address" id="address" rows="3"
                                      class="form-control @error('address') is-invalid @enderror"
                                      placeholder="Full company address">{{ old('address', $data['address']) }}</textarea>
                            @error('address')
                                <span class="invalid-feedback">{{ $message }}</span>
                            @enderror
                        </div>

                        <!-- Status -->
                        <div class="form-group mb-4">
                            <label>
                                <i class="fas fa-power-off"></i> System Status
                            </label>
                            <div class="custom-control custom-switch custom-switch-off-danger custom-switch-on-success">
                                <input type="checkbox" name="active" value="1"
                                       class="custom-control-input" id="activeSwitch"
                                       {{ old('active', $data['active']) == 1 ? 'checked' : '' }}>
                                <label class="custom-control-label" for="activeSwitch">
                                    {{ $data['active'] == 1 ? 'Active' : 'Inactive' }}
                                </label>
                            </div>
                        </div>

                        <!-- Logo Upload -->
                        {{-- <div class="form-group mb-4">
                            <label for="photo">
                                <i class="fas fa-image"></i> Company Logo
                            </label>
                            <div class="input-group">
                                <div class="custom-file">
                                    <input type="file" name="photo" id="photo" class="custom-file-input"
                                           accept="image/*">
                                    <label class="custom-file-label" for="photo">Choose file</label>
                                </div>
                            </div>
                            @if($data['photo'])
                                <div class="mt-3">
                                    <img src="{{ asset('assets/admin/uploads/' . $data['photo']) }}"
                                         alt="Current Logo" class="img-thumbnail"
                                         style="max-height: 120px;">
                                    <small class="text-muted d-block">Current logo</small>
                                </div>
                            @endif
                            @error('photo')
                                <span class="text-danger small">{{ $message }}</span>
                            @enderror
                        </div> --}}

                        <div class="form-group" id="oldimage">
                            <label>Logo Company</label>

                            <div class="image">
                                <img src="{{ asset('assets/admin/uploads/' . $data['photo']) }}" 
                                    alt="Logo"
                                    class="img-thumbnail mb-2"
                                    style="max-height: 120px;">

                                <small class="text-muted d-block">Current logo</small>

                                <!-- Remove button -->
                                <button type="button" class="btn btn-sm btn-danger mt-2" id="update_image">
                                    <i class="fas fa-trash"></i> Remove Logo
                                </button>
                                <button type="button" class="btn btn-sm btn-danger mt-2" id="cancel_update_image" style="display: none;">
                                    <i class="fas fa-trash"></i> Edit Logo
                                </button>
                                
                            </div>
                        </div>


                        <!-- Submit Button -->
                        <div class="form-group text-center mt-5">
                            <button type="submit" class="btn btn-success btn-lg px-5">
                                <i class="fas fa-save"></i> Update Settings
                            </button>
                        </div>
                    </form>
                @else
                    <div class="alert alert-danger text-center">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>No settings data found!</strong> Please contact administrator.
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
    // Auto-update file input label
    document.getElementById('photo').addEventListener('change', function(e) {
        let fileName = e.target.files[0]?.name || 'Choose file';
        e.target.nextElementSibling.innerHTML = fileName;
    });
</script>
@endsection