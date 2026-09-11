import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ScanLine, Camera, Keyboard, X, ArrowRight, Package,
  CheckCircle2, RotateCcw, AlertCircle, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Card, Button, StatusBadge, Input, Select, TextArea, ErrorBanner, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { findItemByItemId, checkOutItem, returnItem, transferItem } from '@/lib/inventory';
import { validateItemId } from '@/lib/qr';
import { formatDateTime } from '@/lib/format';
import { InventoryItem, DESTINATION_OPTIONS } from '@/lib/types';

type ScanState = 'idle' | 'scanning' | 'found' | 'notfound' | 'error' | 'success';
type ActionMode = 'checkout' | 'return' | 'transfer' | null;

interface SuccessInfo {
  action: string;
  itemName: string;
  itemId: string;
  detail: string;
}

export default function Scan() {
  const { profile } = useAuth();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [manualId, setManualId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const isStartingRef = useRef(false);
  const scannerDivId = 'qr-reader';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const s = scannerRef.current;
        scannerRef.current = null;
        if (s.isScanning) {
          await s.stop();
        }
        s.clear();
      } catch {
        // scanner may already be stopped
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const lookupItem = useCallback(
    async (rawCode: string): Promise<InventoryItem | null> => {
      const itemId = validateItemId(rawCode);
      if (!itemId) {
        setErrorMsg(`Invalid QR code: "${rawCode}". Expected format: MHSA-000001`);
        setScanState('error');
        return null;
      }
      const { item: found, error } = await findItemByItemId(itemId);
      if (error) {
        setErrorMsg('Unable to search the database. Please check your connection and try again.');
        setScanState('error');
        return null;
      }
      if (!found) {
        setErrorMsg(`No inventory item found for ${itemId}.`);
        setScanState('notfound');
        return null;
      }
      return found;
    },
    []
  );

  const handleScanResult = useCallback(
    async (decodedText: string) => {
      // Debounce: ignore the same code within 3 seconds
      const now = Date.now();
      if (
        decodedText === lastScanRef.current.code &&
        now - lastScanRef.current.time < 3000
      ) {
        return;
      }
      lastScanRef.current = { code: decodedText, time: now };

      await stopScanner();
      const found = await lookupItem(decodedText);
      if (found) {
        setItem(found);
        setScanState('found');
      }
    },
    [stopScanner, lookupItem]
  );

  const startScanner = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setErrorMsg('');
    setItem(null);
    setActionMode(null);
    setSuccessInfo(null);
    setScanState('scanning');

    // Ensure any previous instance is cleaned up
    await stopScanner();

    try {
      const html5Qrcode = new Html5Qrcode(scannerDivId, {
        verbose: false,
      });
      scannerRef.current = html5Qrcode;
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      setErrorMsg(
        'Unable to access camera. Please grant camera permission in your browser settings, or use manual entry below.'
      );
      setScanState('idle');
    } finally {
      isStartingRef.current = false;
    }
  }, [handleScanResult, stopScanner]);

  const handleManualLookup = async () => {
    if (!manualId.trim()) return;
    setErrorMsg('');
    setScanState('scanning');
    const found = await lookupItem(manualId);
    if (found) {
      setItem(found);
      setScanState('found');
    }
  };

  const reset = async () => {
    await stopScanner();
    setScanState('idle');
    setItem(null);
    setActionMode(null);
    setErrorMsg('');
    setManualId('');
    setSuccessInfo(null);
    lastScanRef.current = { code: '', time: 0 };
  };

  const scanAgain = async () => {
    await stopScanner();
    setItem(null);
    setActionMode(null);
    setSuccessInfo(null);
    setErrorMsg('');
    lastScanRef.current = { code: '', time: 0 };
    await startScanner();
  };

  const onComplete = (action: string, detail: string) => {
    if (item) {
      setSuccessInfo({
        action,
        itemName: item.item_name,
        itemId: item.item_id,
        detail,
      });
    }
    setActionMode(null);
    setItem(null);
    setScanState('success');
  };

  return (
    <div>
      <PageHeader title="Scan" subtitle="Scan QR codes to check equipment in or out" />

      {scanState === 'idle' && (
        <div className="space-y-4">
          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-4">
              <ScanLine className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Scan a QR Code</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Open the camera and point it at a QR code on an equipment label to check out or return gear.
            </p>
            <Button size="lg" onClick={startScanner} className="w-full sm:w-auto">
              <Camera className="w-5 h-5" />
              Start Camera Scan
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Manual Entry</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Can't scan? Enter the item ID manually (e.g. MHSA-000001).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="MHSA-000001"
                className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
              />
              <Button onClick={handleManualLookup} disabled={!manualId.trim()}>
                <ArrowRight className="w-4 h-4" />
                Find
              </Button>
            </div>
          </Card>
        </div>
      )}

      {scanState === 'scanning' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Camera active — scanning...
            </span>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="w-4 h-4" /> Cancel
            </Button>
          </div>
          <div
            id={scannerDivId}
            className="w-full rounded-lg overflow-hidden bg-slate-900 aspect-square max-w-md mx-auto"
          />
          <p className="text-center text-xs text-slate-400 mt-3">
            Point camera at the QR code on the equipment label
          </p>
        </Card>
      )}

      {(scanState === 'error' || scanState === 'notfound') && (
        <Card className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <ErrorBanner message={errorMsg} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset}>Start Over</Button>
            <Button variant="secondary" onClick={startScanner}>
              <Camera className="w-4 h-4" /> Scan Again
            </Button>
          </div>
        </Card>
      )}

      {scanState === 'found' && item && !actionMode && (
        <ItemDisplay item={item} onReset={reset} onAction={setActionMode} />
      )}

      {scanState === 'found' && item && actionMode === 'checkout' && (
        <CheckoutForm
          item={item}
          defaultName={profile?.name ?? ''}
          userId={profile?.id ?? ''}
          onComplete={(detail) => onComplete('Checked Out', detail)}
          onCancel={() => setActionMode(null)}
        />
      )}

      {scanState === 'found' && item && actionMode === 'return' && (
        <ReturnForm
          item={item}
          userId={profile?.id ?? ''}
          onComplete={(detail) => onComplete('Returned to Storage', detail)}
          onCancel={() => setActionMode(null)}
        />
      )}

      {scanState === 'found' && item && actionMode === 'transfer' && (
        <TransferForm
          item={item}
          userId={profile?.id ?? ''}
          onComplete={(detail) => onComplete('Transferred', detail)}
          onCancel={() => setActionMode(null)}
        />
      )}

      {scanState === 'success' && successInfo && (
        <SuccessScreen info={successInfo} onScanAgain={scanAgain} onDone={reset} />
      )}
    </div>
  );
}

function SuccessScreen({
  info,
  onScanAgain,
  onDone,
}: {
  info: SuccessInfo;
  onScanAgain: () => void;
  onDone: () => void;
}) {
  return (
    <Card className="p-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">{info.action}</h2>
      <p className="text-sm text-slate-600 mb-1">{info.itemName}</p>
      <p className="text-xs font-mono text-slate-400 mb-3">{info.itemId}</p>
      <p className="text-sm text-slate-500 mb-6">{info.detail}</p>
      <div className="space-y-2">
        <Button size="lg" className="w-full" onClick={onScanAgain}>
          <Camera className="w-5 h-5" />
          Scan Next Item
        </Button>
        <Button variant="ghost" className="w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    </Card>
  );
}

function ItemDisplay({
  item,
  onReset,
  onAction,
}: {
  item: InventoryItem;
  onReset: () => void;
  onAction: (mode: ActionMode) => void;
}) {
  const isAvailable = item.status === 'AVAILABLE';
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 font-mono mb-1">{item.item_id}</div>
            <h2 className="text-lg font-bold text-slate-900">{item.item_name}</h2>
            <div className="text-sm text-slate-500 mt-0.5">{item.category}</div>
          </div>
          <StatusBadge status={item.status} destination={isAvailable ? 'Storage' : item.current_destination} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Total Qty</div>
            <div className="font-semibold text-slate-900">{item.quantity} {item.unit}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Available</div>
            <div className="font-semibold text-emerald-600">{item.available_quantity} {item.unit}</div>
          </div>
          {!isAvailable && (
            <>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Released</div>
                <div className="font-semibold text-amber-600">{item.released_quantity} {item.unit}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Holder</div>
                <div className="font-semibold text-slate-900">{item.current_holder}</div>
              </div>
            </>
          )}
        </div>

        {item.notes && (
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mb-4">
            {item.notes}
          </div>
        )}

        <div className="text-xs text-slate-400 mb-4">
          {isAvailable ? 'In Storage' : `Released on ${formatDateTime(item.released_at)}`}
        </div>
      </Card>

      <div className="space-y-2">
        {isAvailable ? (
          <Button size="lg" variant="warning" className="w-full" onClick={() => onAction('checkout')}>
            <ArrowRight className="w-5 h-5" />
            Check Out
          </Button>
        ) : (
          <>
            <Button size="lg" variant="success" className="w-full" onClick={() => onAction('return')}>
              <Package className="w-5 h-5" />
              Return to Storage
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => onAction('transfer')}>
              <ArrowRight className="w-5 h-5" />
              Release to Another Team
            </Button>
          </>
        )}
        <Button variant="ghost" className="w-full" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          Scan Another Item
        </Button>
      </div>
    </div>
  );
}

function CheckoutForm({
  item,
  defaultName,
  userId,
  onComplete,
  onCancel,
}: {
  item: InventoryItem;
  defaultName: string;
  userId: string;
  onComplete: (detail: string) => void;
  onCancel: () => void;
}) {
  const [personName, setPersonName] = useState(defaultName);
  const [destinationType, setDestinationType] = useState('My Team');
  const [destination, setDestination] = useState('');
  const [qty, setQty] = useState(String(item.available_quantity));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!personName.trim()) {
      setError('Person taking equipment is required');
      return;
    }
    const checkoutQty = Number(qty);
    if (!checkoutQty || checkoutQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }
    if (checkoutQty > item.available_quantity) {
      setError(`Cannot check out ${checkoutQty} — only ${item.available_quantity} available`);
      return;
    }
    setSubmitting(true);
    const fullDestination = destination.trim() || destinationType;
    const { error } = await checkOutItem({
      item,
      person_name: personName.trim(),
      destination: fullDestination,
      checkoutQty,
      notes: notes.trim(),
      user_id: userId,
    });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    const detail = `${checkoutQty} ${item.unit} to ${personName.trim()} — ${fullDestination}`;
    onComplete(detail);
  };

  return (
    <ActionShell title="Check Out Equipment" item={item} onCancel={onCancel} error={error} submitting={submitting} onSubmit={handleSubmit}>
      <Input label="Person Taking Equipment" value={personName} onChange={setPersonName} required hint="Defaults to your name — edit if checking out on behalf of someone else." />
      <Select
        label="Destination"
        value={destinationType}
        onChange={setDestinationType}
        options={DESTINATION_OPTIONS.map((d) => ({ value: d, label: d }))}
      />
      <Input label="Team / Destination Detail" value={destination} onChange={setDestination} placeholder="e.g. U15 Girls" />
      <Input label="Quantity" type="number" value={qty} onChange={setQty} required hint={`${item.available_quantity} ${item.unit} available`} />
      <TextArea label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Any additional details..." />
    </ActionShell>
  );
}

function ReturnForm({
  item,
  userId,
  onComplete,
  onCancel,
}: {
  item: InventoryItem;
  userId: string;
  onComplete: (detail: string) => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(String(item.released_quantity));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const returnQty = Number(qty);
    if (!returnQty || returnQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }
    if (returnQty > item.released_quantity) {
      setError(`Cannot return ${returnQty} — only ${item.released_quantity} currently released`);
      return;
    }
    setSubmitting(true);
    const { error } = await returnItem({
      item,
      returnQty,
      notes: notes.trim(),
      user_id: userId,
    });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    const detail = `${returnQty} ${item.unit} returned from ${item.current_holder}`;
    onComplete(detail);
  };

  return (
    <ActionShell title="Return to Storage" item={item} onCancel={onCancel} error={error} submitting={submitting} onSubmit={handleSubmit}>
      <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Current holder:</span><span className="font-medium text-slate-900">{item.current_holder}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Destination:</span><span className="font-medium text-slate-900">{item.current_destination}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Released qty:</span><span className="font-medium text-amber-600">{item.released_quantity} {item.unit}</span></div>
      </div>
      <Input label="Quantity to Return" type="number" value={qty} onChange={setQty} required hint={`${item.released_quantity} ${item.unit} currently released`} />
      <TextArea label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Condition, missing items, etc." />
    </ActionShell>
  );
}

function TransferForm({
  item,
  userId,
  onComplete,
  onCancel,
}: {
  item: InventoryItem;
  userId: string;
  onComplete: (detail: string) => void;
  onCancel: () => void;
}) {
  const [newPerson, setNewPerson] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [qty, setQty] = useState(String(item.released_quantity));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!newPerson.trim()) {
      setError('New person is required');
      return;
    }
    if (!newDestination.trim()) {
      setError('New team/destination is required');
      return;
    }
    const transferQty = Number(qty);
    if (!transferQty || transferQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }
    if (transferQty > item.released_quantity) {
      setError(`Cannot transfer ${transferQty} — only ${item.released_quantity} currently released`);
      return;
    }
    setSubmitting(true);
    const { error } = await transferItem({
      item,
      new_person: newPerson.trim(),
      new_destination: newDestination.trim(),
      transferQty,
      notes: notes.trim(),
      user_id: userId,
    });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    const detail = `${transferQty} ${item.unit} from ${item.current_holder} to ${newPerson.trim()} — ${newDestination.trim()}`;
    onComplete(detail);
  };

  return (
    <ActionShell title="Release to Another Team" item={item} onCancel={onCancel} error={error} submitting={submitting} onSubmit={handleSubmit}>
      <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Current holder:</span><span className="font-medium text-slate-900">{item.current_holder}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Current destination:</span><span className="font-medium text-slate-900">{item.current_destination}</span></div>
      </div>
      <Input label="New Person" value={newPerson} onChange={setNewPerson} required placeholder="e.g. Coach John" />
      <Input label="New Team / Destination" value={newDestination} onChange={setNewDestination} required placeholder="e.g. U13 Boys" />
      <Input label="Quantity" type="number" value={qty} onChange={setQty} required hint={`${item.released_quantity} ${item.unit} currently released`} />
      <TextArea label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Reason for transfer..." />
    </ActionShell>
  );
}

function ActionShell({
  title,
  item,
  children,
  onCancel,
  error,
  submitting,
  onSubmit,
}: {
  title: string;
  item: InventoryItem;
  children: React.ReactNode;
  onCancel: () => void;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <div className="text-sm text-slate-500 mt-0.5">{item.item_name} · {item.item_id}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" /> Back
        </Button>
      </div>
      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      <div className="space-y-4">
        {children}
      </div>
      <div className="mt-6">
        <Button size="lg" className="w-full" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Processing...' : 'Confirm'}
        </Button>
      </div>
    </Card>
  );
}
