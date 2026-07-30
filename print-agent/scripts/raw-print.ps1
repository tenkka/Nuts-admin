param(
    [Parameter(Mandatory = $true)][string]$PrinterName,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string]$DocName = "NutsReceipt"
)

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class NutsRawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] data, string docName, out string error)
    {
        error = "";
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = docName;
        di.pDataType = "RAW";
        bool success = false;

        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero))
        {
            error = "OpenPrinter failed, Win32 error " + Marshal.GetLastWin32Error();
            return false;
        }

        try
        {
            if (!StartDocPrinter(hPrinter, 1, di))
            {
                error = "StartDocPrinter failed, Win32 error " + Marshal.GetLastWin32Error();
                return false;
            }

            try
            {
                if (!StartPagePrinter(hPrinter))
                {
                    error = "StartPagePrinter failed, Win32 error " + Marshal.GetLastWin32Error();
                    return false;
                }

                IntPtr pUnmanagedBytes = Marshal.AllocHGlobal(data.Length);
                try
                {
                    Marshal.Copy(data, 0, pUnmanagedBytes, data.Length);
                    int written;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, data.Length, out written);
                    if (!success) error = "WritePrinter failed, Win32 error " + Marshal.GetLastWin32Error();
                }
                finally
                {
                    Marshal.FreeHGlobal(pUnmanagedBytes);
                }

                EndPagePrinter(hPrinter);
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }
        }
        finally
        {
            ClosePrinter(hPrinter);
        }

        return success;
    }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$errorMsg = ""
$result = [NutsRawPrinter]::SendBytesToPrinter($PrinterName, $bytes, $DocName, [ref]$errorMsg)

if ($result) {
    Write-Output '{"ok":true}'
    exit 0
} else {
    $escaped = $errorMsg -replace '\\', '\\\\' -replace '"', '\"'
    Write-Output "{`"ok`":false,`"error`":`"$escaped`"}"
    exit 1
}
