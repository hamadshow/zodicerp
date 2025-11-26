@extends('layouts.admin')

@section('title') General Sitting  @endsection
@section('contentheader') Sitting @endsection
@section('contentheaderlink') <a href="{{ route('admin.adminPanelSetting.index') }}">Sitting</a> @endsection
@section('contentheaderactive') <a href="{{ route('admin.dashboard') }}"> Home </a> @endsection    

@section('content')
     <div id="header"></div>

<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
              <h3 class="card-title">General Sitting</h3>
            </div>
            <div class="card-body">
                @if (@isset($data) && !@empty($data))
           <table id="example2" class="table table-bordered table-hover table-striped">
                 <tbody>
        <!-- Status Row -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Status</td>
            <td>
                @if($data['active'] == 1)
                    <span class="badge bg-success fs-6">
                        <i class="fas fa-check-circle"></i> Active
                    </span>
                @else
                    <span class="badge bg-secondary fs-6">
                        <i class="fas fa-pause-circle"></i> Inactive
                    </span>
                @endif
            </td>
        </tr>

        <!-- Title -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Title</td>
            <td class="fw-semibold">{{ $data['system_name'] ?? '—' }}</td>
        </tr>

        <!-- Company Code -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Company Code</td>
            <td>{{ $data['com_code'] ?? '—' }}</td>
        </tr>

        <!-- Address -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Address</td>
            <td>{{ $data['address'] ?? 'Not provided' }}</td>
        </tr>

        <!-- Phone -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Phone</td>
            <td>
                @if($data['phone'])
                    <i class="fas fa-phone text-primary"></i> {{ $data['phone'] }}
                @else
                    <em class="text-muted">No phone number</em>
                @endif
            </td>
        </tr>

        <!-- Logo -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Logo</td>
            <td>
                @if (!empty($data['photo']))
                <img src="{{ asset('assets/admin/uploads'.'/'.$data['photo']) }}" alt="Logo" 
                class="img-thumbnail"
                style="width: 150px; height: 150px; object-fit: contain; border: 2px solid #dee2e6;">
                @else
                <div class="text-center py-4">
                        <i class="fas fa-image fa-3x text-muted"></i><br>
                        <small class="text-muted">No Logo Uploaded</small>
                    </div>
                @endif

                    
                         
                
            </td>
        </tr>

        <!-- Updated Date -->
        <tr>
            <td style="width: 30%; font-weight: 600; background-color: #f8f9fa;">Updated Date</td>
            <td>
                @if($data['updated_at'] && $data['updated_by'])
                    @php
                        $updatedAt = \Carbon\Carbon::parse($data['updated_at']);
                        $icon = $updatedAt->format('A') === 'AM' ? 'fa-sun text-warning' : 'fa-moon text-primary';
                    @endphp
                    <div class="d-flex align-items-center gap-2">
                        <i class="fas {{ $icon }}"></i>
                        <div>
                            <div class="fw-semibold">
                                {{ $updatedAt->format('d M Y') }}
                                <small class="text-muted">at {{ $updatedAt->format('h:i A') }}</small>
                            </div>
                            <small class="text-muted">
                                by <strong>{{ $data['updated_by_admin'] ?? $data['updated_by'] }}</strong>
                            </small>
                        </div>
                    </div>
                @else
                    <span class="text-muted">
                        <i class="fas fa-clock"></i> Not updated yet
                    </span>
                @endif
            </td>
        </tr>
    </tbody>
</table>

                @else
                    <div class="alert alert-danger">
                        No Data Found
                    
                @endif
              
            </div>
        </div>
    </div>
</div>



                
@endsection