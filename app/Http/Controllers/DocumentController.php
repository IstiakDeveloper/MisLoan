<?php

namespace App\Http\Controllers;

use App\Support\PrivateDocuments;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DocumentController extends Controller
{
    public function show(Request $request, PrivateDocuments $documents): StreamedResponse
    {
        return $documents->response($documents->authorize($request->user(), $request->string('path')->toString()));
    }
}
