@extends('layouts.admin')

@section('title') zodicERP Admin Dashboard @endsection
@section('contentheader') Dashboard @endsection
@section('contentheaderlink') <a href="{{ route('admin.login') }}">Dashboard</a> @endsection
@section('contentheaderactive') <a href="{{ route('admin.dashboard') }}"> Home </a> @endsection    

@section('content')
    <h3>Welcome to zodicERP Admin Dashboard</h3>
@endsection